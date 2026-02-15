// =====================================================
// SIRIUS WEB API - Middleware Super Admin
// Verifica se usuário é SUPER ADMIN (você e sua equipe)
// =====================================================

import { query } from '../config/database.js';

// =====================================================
// Verificar se usuário é SUPER ADMIN
// =====================================================
export const isSuperAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id; // Vem do authenticateToken
    
    // Buscar usuário e verificar se é super admin
    const sql = `
      SELECT is_super_admin
      FROM usuarios
      WHERE id_usuario = $1
    `;
    
    const result = await query(sql, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    const { is_super_admin } = result.rows[0];
    
    if (!is_super_admin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas Super Administradores podem acessar este recurso.'
      });
    }
    
    // Usuário é super admin, pode prosseguir
    req.isSuperAdmin = true; // Marcar para outros middlewares saberem
    next();
    
  } catch (error) {
    console.error('Erro ao verificar super admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar permissões'
    });
  }
};

// =====================================================
// DIFERENÇA: isAdmin vs isSuperAdmin
// =====================================================

/*
isAdmin (por empresa):
- Verifica na tabela usuario_empresa
- Válido apenas para UMA empresa específica
- Cliente pode ser admin da empresa dele
- Usado em: vendedores, formas de pagamento, etc

isSuperAdmin (global):
- Verifica na tabela usuarios (campo is_super_admin)
- Válido para TODAS as empresas
- Apenas você (SIRIUS) e sua equipe
- Usado em: configurar parâmetros, gerenciar sistema

EXEMPLO:

Usuário Alexandre:
- is_super_admin = true → Acessa TUDO
- pode configurar parâmetros de todas empresas

Usuário Cliente X (dono da empresa):
- is_super_admin = false
- is_admin = true (na empresa dele)
- pode gerenciar empresa dele
- NÃO pode configurar parâmetros
*/
