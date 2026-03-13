// =====================================================
// Rotas de Formas de Pagamento
// =====================================================

import express from 'express';
import {
  listarFormasPagamento,
  buscarFormaPagamento,
  criarFormaPagamento,
  atualizarFormaPagamento,
  excluirFormaPagamento
} from '../controllers/formas-pagamento-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { setTenant } from '../middlewares/tenant-middleware.js';

const router = express.Router();

// ROTA BLOQUEADA — nenhum acesso permitido
router.use((req, res) => {
  res.status(403).json({ success: false, message: 'Módulo indisponível.' });
});

// Todas as rotas exigem autenticação e tenant
router.use(authenticateToken);
router.use(setTenant);

// Rotas CRUD
router.get('/', listarFormasPagamento);           // Listar todos
router.get('/:id', buscarFormaPagamento);         // Buscar por ID
router.post('/', criarFormaPagamento);            // Criar novo
router.put('/:id', atualizarFormaPagamento);      // Atualizar
router.delete('/:id', excluirFormaPagamento);     // Excluir

export default router;
