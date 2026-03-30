// =====================================================
// SIRIUS WEB API - Serviço de Log de Auditoria
// =====================================================

import { query, querySchema } from '../config/database.js';

const AUDIT_ENABLED = process.env.AUDIT_LOG_ENABLED !== 'false';

/**
 * Registra uma ação no log de auditoria.
 * Nunca lança erro — falhas de log não devem interromper a operação principal.
 *
 * @param {object} params
 * @param {object} params.req           - Requisição Express (para extrair usuário, empresa e IP)
 * @param {string} params.acao          - 'CRIOU', 'ALTEROU' ou 'EXCLUIU'
 * @param {string} params.modulo        - 'Produtos', 'Clientes', 'Vendedores', etc.
 * @param {string|number} params.id_registro - ID do registro afetado
 * @param {string} params.descricao     - Texto legível descrevendo o que aconteceu
 * @param {object} [params.dados_anteriores] - Dados antes da alteração (UPDATE/DELETE)
 * @param {object} [params.dados_novos]      - Dados após a alteração (INSERT/UPDATE)
 */
export const registrarLog = async ({
  req,
  acao,
  modulo,
  id_registro,
  descricao,
  dados_anteriores = null,
  dados_novos = null
}) => {
  if (!AUDIT_ENABLED) return;

  try {
    const empresaId  = req.empresa?.id  || req.empresaId || req.user?.id_empresa || null;
    const schema     = req.empresa?.schema || null;
    const usuarioId  = req.user?.id || null;
    const nomeUsuario = req.user?.nome || 'Sistema';
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
      || req.socket?.remoteAddress
      || null;

    const sql = `
      INSERT INTO logs_auditoria
        (id_empresa, id_usuario, nome_usuario, acao, modulo, id_registro, descricao, dados_anteriores, dados_novos, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;

    const params = [
      empresaId,
      usuarioId,
      nomeUsuario,
      acao,
      modulo,
      id_registro != null ? String(id_registro) : null,
      descricao,
      dados_anteriores ? JSON.stringify(dados_anteriores) : null,
      dados_novos ? JSON.stringify(dados_novos) : null,
      ip
    ];

    if (schema) {
      await querySchema(schema, sql, params);
    } else {
      await query(sql, params);
    }
  } catch (err) {
    console.error('⚠️ Falha ao registrar log de auditoria:', err.message);
  }
};
