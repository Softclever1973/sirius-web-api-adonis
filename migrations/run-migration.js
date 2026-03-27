// =====================================================
// Runner de Migração: Schema por Empresa
// Execute com: node migrations/run-migration.js
// =====================================================

import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';

const { Client } = pg;

function buildDirectUrl(url) {
  const match = url.match(
    /postgresql:\/\/postgres\.(\w+):([^@]+)@[^/]+\/postgres/
  );
  if (match) {
    const [, projectRef, password] = match;
    return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
  }
  return url.replace(':6543/', ':5432/');
}

const directUrl = buildDirectUrl(process.env.DATABASE_URL);

function newClient() {
  return new Client({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false },
  });
}

const TENANT_TABLES = [
  'produtos',
  'clientes',
  'vendedores',
  'formas_pagamento',
  'movimentacoes_estoque',
  'pedidos_venda',
  'pedidos_venda_itens',
  'pedidos_venda_pagamentos',
  'parametros_valores',
  'logs_auditoria',
];

const PRIMARY_KEYS = {
  produtos:                 'id_produto',
  clientes:                 'id_cliente',
  vendedores:               'id_vendedor',
  formas_pagamento:         'id_forma_pagamento',
  movimentacoes_estoque:    'id_movimentacao',
  pedidos_venda:            'id_pedido_venda',
  pedidos_venda_itens:      'id_item',
  pedidos_venda_pagamentos: 'id',
  parametros_valores:       'id',
  logs_auditoria:           'id_log',
};

async function tableExistsInPublic(client, tableName) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return rows.length > 0;
}

async function migrateEmpresa(emp) {
  // Conexão dedicada por empresa — evita idle timeout da conexão longa
  const client = newClient();
  await client.connect();

  const schemaName = `emp_${emp.id_empresa}`;
  console.log(`\n🏢 Empresa ${emp.id_empresa} — ${emp.razao_social}`);

  try {
    await client.query('BEGIN');

    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    for (const table of TENANT_TABLES) {
      const exists = await tableExistsInPublic(client, table);
      if (!exists) continue;

      // Criar tabela com mesma estrutura (colunas + defaults + constraints, sem índices)
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."${table}"
        (LIKE public."${table}" INCLUDING DEFAULTS INCLUDING CONSTRAINTS)
      `);

      // Copiar dados em bulk
      const { rowCount } = await client.query(`
        INSERT INTO "${schemaName}"."${table}"
        SELECT * FROM public."${table}"
        WHERE id_empresa = ${emp.id_empresa}
      `);

      // Resetar sequence se a tabela tem PK serial
      const pkCol = PRIMARY_KEYS[table];
      if (pkCol) {
        const { rows: seqRows } = await client.query(
          `SELECT pg_get_serial_sequence('"${schemaName}"."${table}"', $1) as seq`,
          [pkCol]
        );
        const seq = seqRows[0]?.seq;
        if (seq) {
          await client.query(`
            SELECT setval(
              '${seq}',
              COALESCE((SELECT MAX("${pkCol}") FROM "${schemaName}"."${table}"), 0) + 1,
              false
            )
          `);
        }
      }

      if (rowCount > 0) {
        console.log(`   ✓ ${table}: ${rowCount} registro(s).`);
      }
    }

    await client.query(
      'UPDATE empresas SET schema_name = $1 WHERE id_empresa = $2',
      [schemaName, emp.id_empresa]
    );

    await client.query('COMMIT');
    console.log(`   ✓ Empresa ${emp.id_empresa} concluída.`);
    return { ok: true };

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(`   ❌ Erro: ${err.message}`);
    return { ok: false, error: err.message };

  } finally {
    await client.end();
  }
}

async function runMigration() {
  console.log('🔌 Conectando ao banco...');
  console.log('   URL:', directUrl.replace(/:([^@]+)@/, ':****@'));

  // Conexão principal apenas para os passos iniciais
  const main = newClient();
  await main.connect();
  console.log('✅ Conectado!\n');

  let empresas;
  try {
    console.log('📋 Passo 1: Adicionando coluna schema_name em empresas...');
    await main.query(`
      ALTER TABLE empresas
        ADD COLUMN IF NOT EXISTS schema_name VARCHAR(50)
    `);
    console.log('   ✓ OK\n');

    const { rows } = await main.query(
      'SELECT id_empresa, razao_social FROM empresas ORDER BY id_empresa'
    );
    empresas = rows;
    console.log(`📋 Passo 2: ${empresas.length} empresa(s) encontrada(s).`);
  } finally {
    await main.end();
  }

  // Migrar cada empresa com conexão própria
  console.log('📋 Passo 3: Migrando (1 conexão por empresa)...');
  const erros = [];
  for (const emp of empresas) {
    const result = await migrateEmpresa(emp);
    if (!result.ok) erros.push({ emp, error: result.error });
  }

  // Verificação final com nova conexão
  const verify = newClient();
  await verify.connect();
  const { rows: result } = await verify.query(
    'SELECT id_empresa, razao_social, schema_name FROM empresas ORDER BY id_empresa'
  );
  await verify.end();

  console.log('\n┌──────────────────────────────────────────────────────────┐');
  console.log('│                RESULTADO DA MIGRAÇÃO                     │');
  console.log('├──────────────────────────────────────────────────────────┤');
  for (const r of result) {
    const status = r.schema_name ? '✓ OK' : '✗ FALHOU';
    const nome   = (r.razao_social || '').substring(0, 25).padEnd(25);
    const schema = (r.schema_name  || 'NENHUM').padEnd(10);
    console.log(`│  [${String(r.id_empresa).padStart(3)}]  ${nome}  ${schema}  ${status}  │`);
  }
  console.log('└──────────────────────────────────────────────────────────┘\n');

  if (erros.length > 0) {
    console.error(`❌ ${erros.length} empresa(s) falharam:`);
    erros.forEach(e => console.error(`   - Empresa ${e.emp.id_empresa}: ${e.error}`));
    process.exit(1);
  }

  console.log('✅ Migração concluída com sucesso!');
  console.log('\n⚠️  Após validar que a API funciona, remova as tabelas');
  console.log('   antigas do public (ver PASSO 6 em migrations/001_schema_per_tenant.sql).\n');
}

runMigration().catch(err => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
