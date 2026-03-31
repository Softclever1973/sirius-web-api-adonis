// =====================================================
// SIRIUS WEB API - Rotas de Log de Auditoria (Super Admin)
// Logs da empresa atual — acesso restrito a Super Admin
// =====================================================

import express from 'express';
import { listarLogs } from '../controllers/logs-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { setTenant } from '../middlewares/tenant-middleware.js';
import { isSuperAdmin } from '../middlewares/issuperadmin-middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(setTenant);
router.use(isSuperAdmin);

// GET /superadmin/logs - Listar logs de auditoria da empresa atual (apenas Super Admin)
router.get('/', listarLogs);

export default router;
