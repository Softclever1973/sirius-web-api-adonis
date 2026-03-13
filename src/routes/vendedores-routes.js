// =====================================================
// Rotas de Vendedores
// =====================================================

import express from 'express';
import {
  listarVendedores,
  buscarVendedor,
  criarVendedor,
  atualizarVendedor,
  excluirVendedor
} from '../controllers/vendedores-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { setTenant } from '../middlewares/tenant-middleware.js';
import { isSuperAdmin } from '../middlewares/issuperadmin-middleware.js';

const router = express.Router();

// Todas as rotas exigem autenticação e tenant
router.use(authenticateToken);
router.use(setTenant);
router.use((req, res, next) => {
  if (req.empresa.is_admin) return next();
  return isSuperAdmin(req,res,next);
});

// Rotas CRUD
router.get('/', listarVendedores);           // Listar todos
router.get('/:id', buscarVendedor);          // Buscar por ID
router.post('/', criarVendedor);             // Criar novo
router.put('/:id', atualizarVendedor);       // Atualizar
router.delete('/:id', excluirVendedor);      // Excluir

export default router;
