// =====================================================
// Configuração do Banco de Dados PostgreSQL
// Otimizado para Vercel Serverless
// =====================================================

// IMPORTANTE: Carregar .env ANTES de importar pg
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

// Debug: mostrar a URL que está sendo usada
console.log('🔍 DATABASE_URL configurada:', process.env.DATABASE_URL ? 'SIM' : 'NÃO');
console.log('🔍 Host:', process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'INDEFINIDO');

// Configuração otimizada por ambiente
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Em produção (Vercel serverless): 1 conexão por função
  // Em desenvolvimento (servidor persistente): até 10 simultâneas
  max: process.env.NODE_ENV === 'production' ? 1 : 10,
  idleTimeoutMillis: process.env.NODE_ENV === 'production' ? 1000 : 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,
  statement_timeout: 10000,
};

// Criar pool de conexões
const pool = new Pool(poolConfig);

// Testar conexão ao iniciar
pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro no pool do PostgreSQL:', err);
});

// Helper para queries com timeout
export const query = async (text, params) => {
  const start = Date.now();
  const client = await pool.connect();
  
  try {
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query executada:', { text: text.substring(0, 50), duration: `${duration}ms`, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro na query:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Helper para transações com timeout
export const getClient = async () => {
  const client = await pool.connect();
  
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);
  
  // Timeout de segurança
  const timeout = setTimeout(() => {
    console.error('❌ Cliente do banco não foi liberado após 10 segundos!');
    client.release();
  }, 10000);
  
  // Sobrescrever release para limpar timeout
  client.release = () => {
    clearTimeout(timeout);
    client.release = originalRelease;
    return originalRelease();
  };
  
  // Manter query original
  client.query = originalQuery;
  
  return client;
};

// Helper para setar empresa_id (RLS) — mantido para compatibilidade
export const setEmpresaId = async (client, empresaId) => {
  await client.query('SET LOCAL app.current_empresa_id = $1', [empresaId]);
};

// =====================================================
// Helper para queries com schema por-empresa
// Usa SET LOCAL search_path dentro de uma transaction
// para que a query resolva as tabelas no schema correto.
// Compatível com PgBouncer em transaction pooling mode.
// =====================================================
export const querySchema = async (schemaName, text, params) => {
  const start = Date.now();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL search_path TO "${schemaName}", public`);
    const result = await client.query(text, params);
    await client.query('COMMIT');

    if (process.env.NODE_ENV === 'development') {
      const duration = Date.now() - start;
      console.log('📊 QuerySchema:', { schema: schemaName, text: text.substring(0, 50), duration: `${duration}ms`, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na querySchema:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// =====================================================
// Helper para transações com schema por-empresa
// Após client.query('BEGIN'), o search_path é setado
// automaticamente para o schema da empresa.
// =====================================================
export const getClientForSchema = async (schemaName) => {
  const client = await pool.connect();

  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  const timeout = setTimeout(() => {
    console.error('❌ Cliente do banco não foi liberado após 10 segundos!');
    client.release = originalRelease;
    originalRelease();
  }, 10000);

  client.release = () => {
    clearTimeout(timeout);
    client.release = originalRelease;
    return originalRelease();
  };

  // Injeta SET LOCAL search_path logo após cada BEGIN
  client.query = async (text, params) => {
    const result = await originalQuery(text, params);
    if (typeof text === 'string' && text.trim().toUpperCase() === 'BEGIN') {
      await originalQuery(`SET LOCAL search_path TO "${schemaName}", public`);
    }
    return result;
  };

  return client;
};

// Cleanup ao encerrar (importante para serverless)
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM recebido, encerrando pool...');
  await pool.end();
});

export default pool;