// =====================================================
// Rotas de Empresas
// =====================================================

import express from 'express';
import { listarEmpresas, buscarEmpresa, atualizarEmpresa } from '../controllers/empresas.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Todas as rotas de empresas requerem autenticação
router.use(authenticateToken);

/**
 * GET /empresas
 * Lista todas as empresas do usuário logado
 * 
 * Headers:
 * Authorization: Bearer <token>
 */
router.get('/', listarEmpresas);

/**
 * GET /empresas/:id
 * Busca dados de uma empresa específica
 * 
 * Headers:
 * Authorization: Bearer <token>
 */
router.get('/:id', buscarEmpresa);

/**
 * PUT /empresas/:id
 * Atualiza dados da empresa (apenas admin)
 * 
 * Headers:
 * Authorization: Bearer <token>
 * 
 * Body: (todos os campos opcionais)
 * {
 *   "razao_social": "Nova Razão Social",
 *   "nome_fantasia": "Novo Nome Fantasia",
 *   "logradouro": "Nova Rua",
 *   "numero": "456",
 *   ...
 * }
 */
router.put('/:id', atualizarEmpresa);

export default router;
