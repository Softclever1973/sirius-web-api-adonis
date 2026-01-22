// =====================================================
// SIRIUS WEB API - Aplicação Express
// =====================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importar rotas
import authRoutes from './routes/auth-routes.js';
import empresasRoutes from './routes/empresas-routes.js';
import produtosRoutes from './routes/produtos-routes.js';
import clientesRoutes from './routes/clientes-routes.js';
import movimentacoesRoutes from './routes/movimentacoes-routes.js';

// Configurar variáveis de ambiente
dotenv.config();

// Criar aplicação Express
const app = express();

// =====================================================
// MIDDLEWARES GLOBAIS
// =====================================================

// CORS - Permitir requisições de outros domínios
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Body parser - JSON
app.use(express.json());

// Body parser - URL encoded
app.use(express.urlencoded({ extended: true }));

// Log de requisições (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// =====================================================
// ROTAS
// =====================================================

// Rota raiz - Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SIRIUS WEB API - Online',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Rotas de autenticação
app.use('/auth', authRoutes);

// Rotas de empresas
app.use('/empresas', empresasRoutes);

// Rotas de produtos
app.use('/produtos', produtosRoutes);

// Rotas de clientes
app.use('/clientes', clientesRoutes);

// Rotas de movimentações
app.use('/movimentacoes', movimentacoesRoutes);

// =====================================================
// TRATAMENTO DE ERROS
// =====================================================

// Rota não encontrada (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.path
  });
});

// Erro global (500)
app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;
