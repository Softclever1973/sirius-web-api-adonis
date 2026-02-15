// =====================================================
// SIRIUS WEB API - Rotas de Valores de Parâmetros
// =====================================================

import express from 'express';
import {
  listarParametrosComValores,
  buscarValorPorCodigo,
  salvarValor,
  salvarMultiplosValores,
  resetarValor
} from '../controllers/parametros-valores-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { setTenant } from '../middlewares/tenant-middleware.js';

const router = express.Router();

// Todas as rotas requerem autenticação e tenant
router.use(authenticateToken);
router.use(setTenant);

// =====================================================
// ROTAS DE VALORES (QUALQUER USUÁRIO AUTENTICADO)
// =====================================================

// Listar todos os parâmetros com valores da empresa
// GET /parametros?modulo=PDV
router.get('/', listarParametrosComValores);

// Buscar valor de um parâmetro específico por código
// GET /parametros/valor/PEDIDO_PERGUNTA_QUANTIDADE
router.get('/valor/:codigo', buscarValorPorCodigo);

// Salvar/atualizar valor de um parâmetro
// POST /parametros/valor
// Body: { id_parametro: 1, valor: 'S' }
router.post('/valor', salvarValor);

// Salvar múltiplos valores de uma vez
// POST /parametros/valores/batch
// Body: { valores: [{ id_parametro: 1, valor: 'S' }, ...] }
router.post('/valores/batch', salvarMultiplosValores);

// Resetar valor para o padrão (apaga customização)
// DELETE /parametros/valor/:id_parametro
router.delete('/valor/:id_parametro', resetarValor);

export default router;
