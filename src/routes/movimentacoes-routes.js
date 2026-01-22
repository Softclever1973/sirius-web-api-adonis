// =====================================================
// SIRIUS WEB API - Rotas de Movimentações de Estoque
// =====================================================

import express from 'express';
import {
  listarMovimentacoes,
  criarMovimentacao
} from '../controllers/movimentacoes-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { setTenant } from '../middlewares/tenant-middleware.js';

const router = express.Router();

// Todas as rotas requerem autenticação e tenant
router.use(authenticateToken);
router.use(setTenant);

// =====================================================
// ROTAS
// =====================================================

// GET /movimentacoes/produto/:produtoId - Listar movimentações de um produto
router.get('/produto/:produtoId', listarMovimentacoes);

// POST /movimentacoes/produto/:produtoId - Criar movimentação (entrada ou saída)
router.post('/produto/:produtoId', criarMovimentacao);

export default router;
