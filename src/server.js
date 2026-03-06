// =====================================================
// SIRIUS WEB API - Servidor
// =====================================================

import dotenv from 'dotenv';

import app from './app.js';
import pool from './config/database.js';

const PORT = process.env.PORT || 8042;
console.log('✨ VARIÁVEL PORT FINAL:', PORT);
// Testar conexão com banco antes de iniciar servidor
async function startServer() {
  try {
    // Testar conexão
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão com PostgreSQL estabelecida');
    console.log('rodando na porta: ', PORT);
    
    // Iniciar servidor
    app.listen(PORT, '0.0.0.0',() => {
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║            🚀 SIRIUS WEB API ONLINE                        ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`🌐 Servidor rodando em: http://localhost:${PORT}`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
      console.log('');
      console.log('📚 Rotas disponíveis:');
      console.log(`   GET  http://localhost:${PORT}/`);
      console.log(`   POST http://localhost:${PORT}/auth/register`);
      console.log(`   POST http://localhost:${PORT}/auth/login`);
      console.log(`   GET  http://localhost:${PORT}/auth/me`);
      console.log(`   GET  http://localhost:${PORT}/empresas`);
      console.log('');
      console.log('💡 Pressione Ctrl+C para parar o servidor');
      console.log('');
    });
    
   } catch (error) {
    console.error('❌ ERRO COMPLETO:');
    console.error(error);
    console.error('');
    console.error('DATABASE_URL:', process.env.DATABASE_URL);
    console.error('');
    process.exit(1);
  }
}

// Tratamento de sinais de término
process.on('SIGTERM', async () => {
  console.log('');
  console.log('🛑 SIGTERM recebido. Encerrando servidor...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('');
  console.log('🛑 SIGINT recebido. Encerrando servidor...');
  await pool.end();
  process.exit(0);
});

// Iniciar servidor
startServer();
