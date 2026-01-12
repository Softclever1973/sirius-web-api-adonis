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

// Configuração otimizada para serverless
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // AJUSTES PARA VERCEL SERVERLESS
  max: 1, // Apenas 1 conexão por função serverless
  idleTimeoutMillis: 1000, // Fechar conexões ociosas rapidamente
  connectionTimeoutMillis: 5000, // Timeout de conexão: 5 segundos
  allowExitOnIdle: true, // Permitir que o processo termine
  statement_timeout: 10000, // Timeout de query: 10 segundos
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

// Helper para setar empresa_id (RLS)
export const setEmpresaId = async (client, empresaId) => {
  await client.query('SET LOCAL app.current_empresa_id = $1', [empresaId]);
};

// Cleanup ao encerrar (importante para serverless)
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM recebido, encerrando pool...');
  await pool.end();
});

export default pool;