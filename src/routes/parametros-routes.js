// =====================================================
// SIRIUS WEB API - Rotas de Parâmetros
// =====================================================

import express from 'express';
import {
  listarParametros,
  buscarParametro,
  criarParametro,
  atualizarParametro,
  excluirParametro
} from '../controllers/parametros-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { setTenant } from '../middlewares/tenant-middleware.js';
import { isAdmin } from '../middlewares/isadmin-middleware.js'; // ✅ ADICIONADO

const router = express.Router();

// Middleware de autenticação e tenant aplicado a todas as rotas
router.use(authenticateToken);
router.use(setTenant);
router.use(isAdmin); // ✅ ADICIONADO - Apenas admins podem acessar

// =====================================================
// ROTAS DE PARÂMETROS
// =====================================================

// Listar parâmetros (com paginação e filtros)
router.get('/', listarParametros);

// Buscar parâmetro por ID
router.get('/:id', buscarParametro);

// Criar novo parâmetro
router.post('/', criarParametro);

// Atualizar parâmetro
router.put('/:id', atualizarParametro);

// Excluir parâmetro
router.delete('/:id', excluirParametro);

export default router;
