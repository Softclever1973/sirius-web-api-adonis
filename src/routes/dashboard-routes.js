// =====================================================
// SIRIUS WEB API - Rotas do Dashboard
// Apenas admin e super admin podem acessar
// =====================================================

import express from 'express';
import { getDashboard } from '../controllers/dashboard-controller.js';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { setTenant } from '../middlewares/tenant-middleware.js';
import { isSuperAdmin } from '../middlewares/issuperadmin-middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(setTenant);

// Admin passa direto (is_admin já carregado pelo setTenant)
// Caso contrário, verifica se é super admin
router.use((req, res, next) => {
  if (req.empresa.is_admin) return next();
  return isSuperAdmin(req, res, next);
});

router.get('/', getDashboard);

export default router;
