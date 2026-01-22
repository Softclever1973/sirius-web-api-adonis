// =====================================================
// Middleware de Row Level Security (RLS)
// =====================================================

/**
 * Middleware para setar empresa_id no PostgreSQL (RLS)
 * 
 * IMPORTANTE: Este middleware deve ser usado APÓS authenticateToken
 * 
 * A empresa_id pode vir de duas formas:
 * 1. Header X-Empresa-Id (usuário escolheu qual empresa acessar)
 * 2. Query parameter ?empresa_id=123
 * 
 * O middleware valida se o usuário realmente tem acesso à empresa
 */

import { query } from '../config/database.js';

export const setTenant = async (req, res, next) => {
  try {
    // Pegar empresa_id do header ou query
    const empresaId = req.headers['x-empresa-id'] || req.query.empresa_id;
    
    if (!empresaId) {
      return res.status(400).json({
        success: false,
        message: 'empresa_id não fornecido. Use o header X-Empresa-Id ou query ?empresa_id=123'
      });
    }
    
    // Validar se o usuário tem acesso a essa empresa
    const result = await query(
      `SELECT ue.id_empresa, ue.is_admin, e.razao_social, e.nome_fantasia
       FROM usuario_empresa ue
       JOIN empresas e ON e.id_empresa = ue.id_empresa
       WHERE ue.id_usuario = $1 AND ue.id_empresa = $2 AND ue.ativo = true`,
      [req.user.id, empresaId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem acesso a esta empresa.'
      });
    }
    
    // Adicionar dados da empresa no request
    req.empresa = {
      id: result.rows[0].id_empresa,
      razao_social: result.rows[0].razao_social,
      nome_fantasia: result.rows[0].nome_fantasia,
      is_admin: result.rows[0].is_admin
    };
    
    // Setar empresa_id para RLS (via session variable do PostgreSQL)
    // NOTA: Isso será feito em cada query, não globalmente
    // Por isso salvamos req.empresa.id
    
    next();
  } catch (error) {
    console.error('Erro no middleware setTenant:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao validar acesso à empresa.'
    });
  }
};

/**
 * Middleware opcional - não retorna erro se empresa_id não for fornecido
 * Útil para rotas que podem funcionar sem contexto de empresa
 */
export const optionalTenant = async (req, res, next) => {
  const empresaId = req.headers['x-empresa-id'] || req.query.empresa_id;
  
  if (empresaId && req.user) {
    try {
      const result = await query(
        `SELECT ue.id_empresa, ue.is_admin, e.razao_social, e.nome_fantasia
         FROM usuario_empresa ue
         JOIN empresas e ON e.id_empresa = ue.id_empresa
         WHERE ue.id_usuario = $1 AND ue.id_empresa = $2 AND ue.ativo = true`,
        [req.user.id, empresaId]
      );
      
      if (result.rows.length > 0) {
        req.empresa = {
          id: result.rows[0].id_empresa,
          razao_social: result.rows[0].razao_social,
          nome_fantasia: result.rows[0].nome_fantasia,
          is_admin: result.rows[0].is_admin
        };
      }
    } catch (error) {
      console.error('Erro no optionalTenant:', error);
    }
  }
  
  next();
};
