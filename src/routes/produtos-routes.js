// =====================================================
// SIRIUS WEB API - Rotas de Produtos
// =====================================================

import express from 'express';
import {
  listarProdutos,
  buscarProduto,
  criarProduto,
  atualizarProduto,
  deletarProduto
} from '../controllers/produtos-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { setTenant } from '../middlewares/tenant-middleware.js';

const router = express.Router();

// Todas as rotas requerem autenticação e tenant
router.use(authenticateToken);
router.use(setTenant);

// =====================================================
// ROTAS
// =====================================================

// GET /produtos - Listar produtos (com paginação e filtros)
router.get('/', listarProdutos);

// GET /produtos/:id - Buscar produto específico
router.get('/:id', buscarProduto);

// POST /produtos - Criar produto
router.post('/', criarProduto);

// PUT /produtos/:id - Atualizar produto
router.put('/:id', atualizarProduto);

// DELETE /produtos/:id - Inativar produto (soft delete)
router.delete('/:id', deletarProduto);

export default router;
