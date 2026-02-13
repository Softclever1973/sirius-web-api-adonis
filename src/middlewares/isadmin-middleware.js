// =====================================================
// SIRIUS WEB API - Middleware de Verificação de Admin
// =====================================================

import { query } from '../config/database.js';

// =====================================================
// Verificar se usuário é administrador da empresa
// =====================================================
export const isAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id; // ✅ CORRIGIDO - era id_usuario
    const empresaId = req.empresa.id;   // Vem do setTenant
    
    // Verificar se usuário é admin na empresa
    const sql = `
      SELECT is_admin
      FROM usuario_empresa
      WHERE id_usuario = $1 AND id_empresa = $2 AND ativo = true
    `;
    
    const result = await query(sql, [userId, empresaId]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Usuário não vinculado a esta empresa'
      });
    }
    
    const { is_admin } = result.rows[0];
    
    if (!is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem acessar este recurso.'
      });
    }
    
    // Usuário é admin, pode prosseguir
    next();
    
  } catch (error) {
    console.error('Erro ao verificar admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar permissões'
    });
  }
};
