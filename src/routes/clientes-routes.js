// =====================================================
// SIRIUS WEB API - Rotas de Clientes
// =====================================================

import express from 'express';
import {
  listarClientes,
  buscarCliente,
  criarCliente,
  atualizarCliente,
  deletarCliente
} from '../controllers/clientes-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { setTenant } from '../middlewares/tenant-middleware.js';

const router = express.Router();

// Todas as rotas requerem autenticação e tenant
router.use(authenticateToken);
router.use(setTenant);

// =====================================================
// ROTAS
// =====================================================

// GET /clientes - Listar clientes (com paginação e filtros)
router.get('/', listarClientes);

// GET /clientes/:id - Buscar cliente específico
router.get('/:id', buscarCliente);

// POST /clientes - Criar cliente
router.post('/', criarCliente);

// PUT /clientes/:id - Atualizar cliente
router.put('/:id', atualizarCliente);

// DELETE /clientes/:id - Inativar cliente (soft delete)
router.delete('/:id', deletarCliente);

export default router;
