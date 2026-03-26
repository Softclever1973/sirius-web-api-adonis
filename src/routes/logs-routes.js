// =====================================================
// SIRIUS WEB API - Rotas de Log de Auditoria
// =====================================================

import express from 'express';
import { listarLogs } from '../controllers/logs-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { setTenant } from '../middlewares/tenant-middleware.js';
import { isAdmin } from '../middlewares/isadmin-middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(setTenant);
router.use(isAdmin);

// GET /logs - Listar logs de auditoria
router.get('/', listarLogs);

export default router;
