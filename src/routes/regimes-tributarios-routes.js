// =====================================================
// Rotas de Regimes Tributários
// =====================================================

import express from 'express';
import {
  listarRegimesTributarios,
  buscarRegimeTributario,
  criarRegimeTributario,
  atualizarRegimeTributario,
  excluirRegimeTributario
} from '../controllers/regimes-tributarios-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';

const router = express.Router();

// Todas as rotas exigem autenticação (não usa tenant pois é global)
router.use(authenticateToken);

// Rotas CRUD
router.get('/', listarRegimesTributarios);           // Listar todos
router.get('/:id', buscarRegimeTributario);          // Buscar por ID
router.post('/', criarRegimeTributario);             // Criar novo
router.put('/:id', atualizarRegimeTributario);       // Atualizar
router.delete('/:id', excluirRegimeTributario);      // Excluir

export default router;
