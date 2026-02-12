// =====================================================
// SIRIUS WEB API - Rotas de Clientes
// VERSÃO CORRIGIDA - Com suporte a PATCH para status
// =====================================================

import express from 'express';
import {
  listarClientes,
  buscarCliente,
  criarCliente,
  atualizarCliente,
  deletarCliente,
  alterarStatusCliente
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

// PATCH /clientes/:id - Alterar status (ativar/inativar)
router.patch('/:id', alterarStatusCliente);

// DELETE /clientes/:id - Inativar cliente (soft delete)
router.delete('/:id', deletarCliente);

export default router;
