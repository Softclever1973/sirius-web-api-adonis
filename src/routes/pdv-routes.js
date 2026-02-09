// =====================================================
// SIRIUS WEB API - Rotas de PDV
// =====================================================

import express from 'express';
import { 
  buscarClientes,
  buscarProdutos,
  obterPrimeiroCliente,
  listarFormasPagamento,
  obterProximoNumero,
  finalizarPedido,
  listarPedidos,
  buscarPedido
} from '../controllers/pdv-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { setTenant } from '../middlewares/tenant-middleware.js';

const router = express.Router();

// Middleware de autenticação e tenant aplicado a todas as rotas
router.use(authenticateToken);
router.use(setTenant);

// =====================================================
// ROTAS DE BUSCA PARA PDV
// =====================================================

// Buscar clientes (por razão social ou CNPJ)
router.get('/clientes/buscar', buscarClientes);

// Buscar produtos (por código, EAN ou descrição)
router.get('/produtos/buscar', buscarProdutos);

// Obter primeiro cliente (Consumidor Final)
router.get('/cliente-padrao', obterPrimeiroCliente);

// Listar formas de pagamento ativas
router.get('/formas-pagamento', listarFormasPagamento);

// Obter próximo número de pedido
router.get('/proximo-numero', obterProximoNumero);

// =====================================================
// ROTAS DE PEDIDOS
// =====================================================

// Listar pedidos
router.get('/pedidos', listarPedidos);

// Buscar pedido por ID
router.get('/pedidos/:id', buscarPedido);

// Finalizar pedido (criar pedido + itens + pagamentos + baixa estoque)
router.post('/pedidos/finalizar', finalizarPedido);

export default router;
