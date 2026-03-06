// =====================================================
// SIRIUS WEB API - Aplicação Express
// =====================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from "path";
import { fileURLToPath } from "url";

// Importar rotas
import authRoutes from './routes/auth-routes.js';
import empresasRoutes from './routes/empresas-routes.js';
import produtosRoutes from './routes/produtos-routes.js';
import clientesRoutes from './routes/clientes-routes.js';
import movimentacoesRoutes from './routes/movimentacoes-routes.js';
import vendedoresRoutes from './routes/vendedores-routes.js';
import formasPagamentoRoutes from './routes/formas-pagamento-routes.js';
import regimesTributariosRoutes from './routes/regimes-tributarios-routes.js';
import pdvRoutes from './routes/pdv-routes.js';
import pedidosRoutes from './routes/pedidos-routes.js';
import parametrosDefinicoesRoutes from './routes/parametros-definicoes-routes.js'; // ✅ NOVO
import parametrosValoresRoutes from './routes/parametros-valores-routes.js'; // ✅ NOVO
import parametrosSuperAdminRoutes from './routes/parametros-superadmin-routes.js'; // ✅ SUPER ADMIN

// Configurar variáveis de ambiente
dotenv.config();
console.log('🔍 .env carregado, PORT do .env:', process.env.PORT); // Debug: verificar se .env foi lido

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Criar aplicação Express
const app = express();

// =====================================================
// MIDDLEWARES GLOBAIS
// =====================================================

// CORS - Permitir requisições de outros domínios
app.use(cors({
  origin: true, // Aceita qualquer origem automaticamente
  credentials: true
}));

// Body parser - JSON
app.use(express.json());

// Conexão com HTML estático
app.use(express.static(path.join(__dirname, "../../sirius-web-frontend-adonis")));

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

// Rotas de vendedores
app.use('/vendedores', vendedoresRoutes);

// Rotas de formas de pagamento
app.use('/formas-pagamento', formasPagamentoRoutes);

// Rotas de regimes tributários
app.use('/regimes-tributarios', regimesTributariosRoutes);

// Rotas de PDV
app.use('/pdv', pdvRoutes);

// Rotas de Pedidos (Consulta)
app.use('/pdv', pedidosRoutes);

// Rotas de Parâmetros ✅ ATUALIZADO
app.use('/parametros/superadmin', parametrosSuperAdminRoutes); // Super Admin (configurar empresas)
app.use('/parametros/definicoes', parametrosDefinicoesRoutes); // Definições globais (super admin)
app.use('/parametros', parametrosValoresRoutes);                // Valores por empresa (todos)

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
