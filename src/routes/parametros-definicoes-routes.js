// =====================================================
// SIRIUS WEB API - Rotas de Definições de Parâmetros
// =====================================================

import express from 'express';
import {
  listarDefinicoes,
  buscarDefinicao,
  buscarDefinicaoPorCodigo,
  criarDefinicao,
  atualizarDefinicao,
  excluirDefinicao
} from '../controllers/parametros-definicoes-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { isSuperAdmin } from '../middlewares/issuperadmin-middleware.js'; // ✅ MUDOU!

const router = express.Router();

// Todas as rotas requerem autenticação E super admin
router.use(authenticateToken);
router.use(isSuperAdmin); // ✅ MUDOU - Apenas Super Admin (você)

// =====================================================
// ROTAS DE DEFINIÇÕES (APENAS SUPER ADMIN)
// =====================================================

// Listar todas as definições
router.get('/', listarDefinicoes);

// Buscar por ID
router.get('/:id', buscarDefinicao);

// Buscar por código
router.get('/codigo/:codigo', buscarDefinicaoPorCodigo);

// Criar nova definição
router.post('/', criarDefinicao);

// Atualizar definição
router.put('/:id', atualizarDefinicao);

// Excluir definição
router.delete('/:id', excluirDefinicao);

export default router;
