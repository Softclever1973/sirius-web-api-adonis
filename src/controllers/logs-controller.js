// =====================================================
// SIRIUS WEB API - Controller de Logs de Auditoria
// =====================================================

import { query } from '../config/database.js';

/**
 * GET /logs
 * Lista o log de auditoria da empresa com paginação e filtros.
 * Requer: autenticação + tenant + isAdmin
 *
 * Query params:
 *  - page, limit
 *  - modulo  (ex: 'Produtos')
 *  - acao    (ex: 'CRIOU')
 *  - usuario (busca por nome parcial)
 *  - de      (data inicial ISO, ex: 2026-01-01)
 *  - ate     (data final ISO, ex: 2026-12-31)
 */
export const listarLogs = async (req, res) => {
  try {
    const empresaId = req.empresa.id;

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const offset = (page - 1) * limit;

    const { modulo, acao, usuario, de, ate } = req.query;

    let conditions = ['id_empresa = $1'];
    let params     = [empresaId];
    let p          = 2;

    if (modulo) {
      conditions.push(`modulo = $${p++}`);
      params.push(modulo);
    }
    if (acao) {
      conditions.push(`acao = $${p++}`);
      params.push(acao.toUpperCase());
    }
    if (usuario) {
      conditions.push(`nome_usuario ILIKE $${p++}`);
      params.push(`%${usuario}%`);
    }
    if (de) {
      conditions.push(`created_at >= $${p++}`);
      params.push(de);
    }
    if (ate) {
      conditions.push(`created_at < ($${p++}::date + INTERVAL '1 day')`);
      params.push(ate);
    }

    const where = conditions.join(' AND ');

    const countResult = await querySchema(req.empresa.schema, 
      `SELECT COUNT(*) AS total FROM logs_auditoria WHERE ${where}`,
      params
    );
    const total      = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    const dataResult = await querySchema(req.empresa.schema, 
      `SELECT
         id_log,
         id_usuario,
         nome_usuario,
         acao,
         modulo,
         id_registro,
         descricao,
         dados_anteriores,
         dados_novos,
         ip_address,
         created_at
       FROM logs_auditoria
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Erro ao listar logs de auditoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar logs de auditoria'
    });
  }
};
