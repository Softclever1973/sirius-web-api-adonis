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