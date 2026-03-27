// =====================================================
// SIRIUS WEB API - Controller de Configuração de Parâmetros (Super Admin)
// Super Admin configura valores de QUALQUER empresa
// =====================================================

import { query, querySchema } from '../config/database.js';

// Busca o schema_name de uma empresa pelo id
const getSchemaName = async (id_empresa) => {
  const r = await query('SELECT schema_name FROM empresas WHERE id_empresa = $1', [id_empresa]);
  return r.rows[0]?.schema_name || null;
};

// =====================================================
// LISTAR EMPRESAS DISPONÍVEIS (para dropdown)
// =====================================================
export const listarEmpresas = async (req, res) => {
  try {
    const { id: idUsuario } = req.user; // ID do usuário logado
    
    const sql = `
      SELECT 
        e.id_empresa,
        e.razao_social,
        e.nome_fantasia,
        e.cnpj,
        e.plano,
        e.status
      FROM empresas e
      INNER JOIN usuario_empresa ue ON e.id_empresa = ue.id_empresa
      WHERE e.status = 'A' AND ue.id_usuario = $1 AND ue.ativo = true
      ORDER BY e.razao_social
    `;
    
    const result = await query(sql, [idUsuario]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar empresas'
    });
  }
};

// =====================================================
// LISTAR PARÂMETROS COM VALORES DE UMA EMPRESA ESPECÍFICA
// Super Admin escolhe qual empresa quer configurar
// =====================================================
export const listarParametrosEmpresa = async (req, res) => {
  try {
    const { id_empresa } = req.params;
    const { modulo } = req.query;

    if (!id_empresa) {
      return res.status(400).json({
        success: false,
        message: 'ID da empresa é obrigatório'
      });
    }

    const schemaName = await getSchemaName(id_empresa);

    let whereClause = 'WHERE pd.ativo = true';
    let queryParams = [id_empresa];
    let paramIndex = 2;

    if (modulo) {
      whereClause += ` AND pd.modulo = $${paramIndex}`;
      queryParams.push(modulo);
      paramIndex++;
    }

    const sql = `
      SELECT
        pd.id_parametro,
        pd.codigo,
        pd.descricao,
        pd.descricao_complementar,
        pd.tipo,
        pd.opcoes,
        pd.valor_padrao,
        pd.modulo,
        pd.obrigatorio,
        pd.ordem,
        COALESCE(pv.valor, pd.valor_padrao) as valor_atual,
        pv.updated_at as valor_updated_at,
        pv.updated_by,
        CASE WHEN pv.id IS NOT NULL THEN true ELSE false END as tem_valor_customizado
      FROM public.parametros_definicoes pd
      LEFT JOIN parametros_valores pv
        ON pv.id_parametro = pd.id_parametro
        AND pv.id_empresa = $1
      ${whereClause}
      ORDER BY pd.modulo, pd.ordem, pd.descricao
    `;

    // parametros_valores fica no schema da empresa; parametros_definicoes em public
    const result = schemaName
      ? await querySchema(schemaName, sql, queryParams)
      : await query(sql, queryParams);
    
    // Agrupar por módulo
    const porModulo = result.rows.reduce((acc, param) => {
      const modulo = param.modulo || 'Geral';
      if (!acc[modulo]) {
        acc[modulo] = [];
      }
      acc[modulo].push(param);
      return acc;
    }, {});
    
    // Buscar dados da empresa
    const empresaSql = `
      SELECT razao_social, nome_fantasia, cnpj, plano
      FROM empresas 
      WHERE id_empresa = $1
    `;
    const empresaResult = await query(empresaSql, [id_empresa]);
    
    res.json({
      success: true,
      empresa: empresaResult.rows[0] || null,
      data: result.rows,
      porModulo: porModulo,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Erro ao listar parâmetros da empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar parâmetros'
    });
  }
};

// =====================================================
// SALVAR VALOR DE PARÂMETRO PARA UMA EMPRESA
// Super Admin define valor para empresa específica
// =====================================================
export const salvarValorEmpresa = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id_empresa, id_parametro, valor } = req.body;

    if (!id_empresa || !id_parametro || valor === undefined || valor === null) {
      return res.status(400).json({
        success: false,
        message: 'ID da empresa, ID do parâmetro e valor são obrigatórios'
      });
    }

    const schemaName = await getSchemaName(id_empresa);

    // parametros_definicoes é em public — query normal
    const paramSql = `
      SELECT id_parametro, codigo, tipo, opcoes
      FROM public.parametros_definicoes
      WHERE id_parametro = $1 AND ativo = true
    `;
    const paramResult = await query(paramSql, [id_parametro]);

    if (paramResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parâmetro não encontrado'
      });
    }

    const parametro = paramResult.rows[0];

    const valorValidado = validarValor(parametro, valor);
    if (valorValidado.error) {
      return res.status(400).json({
        success: false,
        message: valorValidado.error
      });
    }

    // parametros_valores é por-tenant — usar querySchema quando disponível
    const exec = (sql, params) => schemaName
      ? querySchema(schemaName, sql, params)
      : query(sql, params);

    const checkResult = await exec(
      'SELECT id FROM parametros_valores WHERE id_empresa = $1 AND id_parametro = $2',
      [id_empresa, id_parametro]
    );

    let result;

    if (checkResult.rows.length > 0) {
      result = await exec(
        `UPDATE parametros_valores
         SET valor = $1, updated_at = NOW(), updated_by = $2
         WHERE id_empresa = $3 AND id_parametro = $4
         RETURNING *`,
        [valorValidado.valor, userId, id_empresa, id_parametro]
      );
    } else {
      result = await exec(
        `INSERT INTO parametros_valores (id_empresa, id_parametro, valor, updated_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id_empresa, id_parametro, valorValidado.valor, userId]
      );
    }
    
    res.json({
      success: true,
      message: 'Valor salvo com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao salvar valor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar valor'
    });
  }
};

// =====================================================
// RESETAR VALOR PARA PADRÃO (empresa específica)
// =====================================================
export const resetarValorEmpresa = async (req, res) => {
  try {
    const { id_empresa, id_parametro } = req.params;
    
    const sql = `
      DELETE FROM parametros_valores 
      WHERE id_empresa = $1 AND id_parametro = $2
      RETURNING *
    `;
    
    const result = await query(sql, [id_empresa, id_parametro]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Valor não encontrado (já está no padrão)'
      });
    }
    
    res.json({
      success: true,
      message: 'Valor resetado para o padrão'
    });
    
  } catch (error) {
    console.error('Erro ao resetar valor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao resetar valor'
    });
  }
};

// =====================================================
// FUNÇÃO AUXILIAR: VALIDAR VALOR
// =====================================================
function validarValor(parametro, valor) {
  const { tipo, opcoes } = parametro;
  
  try {
    switch (tipo) {
      case 'BOOLEAN':
        if (!['S', 'N', 'true', 'false', '1', '0'].includes(String(valor))) {
          return { error: 'Valor booleano inválido. Use: S, N, true, false, 1 ou 0' };
        }
        const normalizado = ['S', 'true', '1'].includes(String(valor)) ? 'S' : 'N';
        return { valor: normalizado };
        
      case 'INTEGER':
        const intValor = parseInt(valor);
        if (isNaN(intValor)) {
          return { error: 'Valor deve ser um número inteiro' };
        }
        return { valor: String(intValor) };
        
      case 'DECIMAL':
        const decValor = parseFloat(valor);
        if (isNaN(decValor)) {
          return { error: 'Valor deve ser um número decimal' };
        }
        return { valor: String(decValor) };
        
      case 'SELECT':
        if (opcoes) {
          const opcoesArray = Array.isArray(opcoes) ? opcoes : JSON.parse(opcoes);
          if (!opcoesArray.includes(String(valor))) {
            return { error: `Valor deve ser um dos: ${opcoesArray.join(', ')}` };
          }
        }
        return { valor: String(valor) };
        
      case 'TEXT':
      default:
        return { valor: String(valor) };
    }
  } catch (error) {
    return { error: 'Erro ao validar valor: ' + error.message };
  }
}
