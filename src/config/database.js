// =====================================================
// Configuração do Banco de Dados PostgreSQL
// =====================================================

// IMPORTANTE: Carregar .env ANTES de importar pg
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

// Debug: mostrar a URL que está sendo usada
console.log('🔍 DATABASE_URL configurada:', process.env.DATABASE_URL ? 'SIM' : 'NÃO');
console.log('🔍 Host:', process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'INDEFINIDO');

// Criar pool de conexões
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Testar conexão ao iniciar
pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro no pool do PostgreSQL:', err);
  process.exit(-1);
});

// Helper para queries
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query executada:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro na query:', error);
    throw error;
  }
};

// Helper para transações
export const getClient = async () => {
  const client = await pool.connect();
  
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  const timeout = setTimeout(() => {
    console.error('❌ Cliente do banco não foi liberado após 5 segundos!');
  }, 5000);
  
  client.release = () => {
    clearTimeout(timeout);
    client.release = release;
    return release();
  };
  
  return client;
};

// Helper para setar empresa_id (RLS)
export const setEmpresaId = async (client, empresaId) => {
  await client.query('SET LOCAL app.current_empresa_id = $1', [empresaId]);
};

export default pool;