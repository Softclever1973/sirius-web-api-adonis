// =====================================================
// SIRIUS WEB API - Rotas de Configuração Super Admin
// Super Admin configura parâmetros de QUALQUER empresa
// =====================================================

import express from 'express';
import {
  listarEmpresas,
  listarParametrosEmpresa,
  salvarValorEmpresa,
  resetarValorEmpresa
} from '../controllers/parametros-superadmin-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { isSuperAdmin } from '../middlewares/issuperadmin-middleware.js';

const router = express.Router();

// Todas as rotas requerem autenticação E super admin
router.use(authenticateToken);
router.use(isSuperAdmin);

// =====================================================
// ROTAS DE CONFIGURAÇÃO (APENAS SUPER ADMIN)
// =====================================================

// Listar todas as empresas (para dropdown)
// GET /parametros/superadmin/empresas
router.get('/empresas', listarEmpresas);

// Listar parâmetros de uma empresa específica
// GET /parametros/superadmin/empresa/:id_empresa
router.get('/empresa/:id_empresa', listarParametrosEmpresa);

// Salvar valor de parâmetro para uma empresa
// POST /parametros/superadmin/valor
// Body: { id_empresa, id_parametro, valor }
router.post('/valor', salvarValorEmpresa);

// Resetar valor para padrão
// DELETE /parametros/superadmin/valor/:id_empresa/:id_parametro
router.delete('/valor/:id_empresa/:id_parametro', resetarValorEmpresa);

export default router;
