// =====================================================
// Rotas de Autenticação
// =====================================================

import express from 'express';
import { register, login, me } from '../controllers/auth-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';

const router = express.Router();

/**
 * POST /auth/register
 * Cadastrar nova empresa + primeiro usuário (FREE)
 * 
 * Body:
 * {
 *   "nome": "João",
 *   "sobrenome": "Silva",
 *   "email": "joao@exemplo.com",
 *   "senha": "senha123",
 *   "celular": "11999999999",
 *   "razao_social": "Empresa Exemplo Ltda",
 *   "nome_fantasia": "Empresa Exemplo",
 *   "cnpj": "12345678901234",
 *   "logradouro": "Rua Exemplo",
 *   "numero": "123",
 *   "bairro": "Centro",
 *   "uf": "SP",
 *   "cep": "01234567",
 *   "telefone": "1133334444",
 *   "email_empresa": "contato@exemplo.com"
 * }
 */
router.post('/register', register);

/**
 * POST /auth/login
 * Login do usuário
 * 
 * Body:
 * {
 *   "email": "joao@exemplo.com",
 *   "senha": "senha123"
 * }
 * 
 * Retorna: token JWT + lista de empresas que o usuário tem acesso
 */
router.post('/login', login);

/**
 * GET /auth/me
 * Retorna dados do usuário logado + suas empresas
 * 
 * Headers:
 * Authorization: Bearer <token>
 */
router.get('/me', authenticateToken, me);

export default router;
