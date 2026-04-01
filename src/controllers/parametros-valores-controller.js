// =====================================================
// SIRIUS WEB API - Controller de Valores de Parâmetros
// Gerencia os valores configurados POR EMPRESA
// =====================================================

import { query, querySchema } from '../config/database.js';
import { registrarLog } from '../services/audit-service.js';

// =====================================================
// LISTAR PARÂMETROS COM VALORES DA EMPRESA
// Retorna TODOS os parâmetros com valores configurados ou padrão
// =====================================================
export const listarParametrosComValores = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const { modulo } = req.query;
    
    let whereClause = 'WHERE pd.ativo = true';
    let queryParams = [empresaId];
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
        CASE WHEN pv.id IS NOT NULL THEN true ELSE false END as tem_valor_customizado
      FROM public.parametros_definicoes pd
      LEFT JOIN parametros_valores pv
        ON pv.id_parametro = pd.id_parametro 
        AND pv.id_empresa = $1
      ${whereClause}
      ORDER BY pd.modulo, pd.ordem, pd.descricao
    `;
    
    const result = await querySchema(req.empresa.schema, sql, queryParams);
    
    // Agrupar por módulo
    const porModulo = result.rows.reduce((acc, param) => {
      const modulo = param.modulo || 'Geral';
      if (!acc[modulo]) {
        acc[modulo] = [];
      }
      acc[modulo].push(param);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: result.rows,
      porModulo: porModulo,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Erro ao listar parâmetros:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar parâmetros'
    });
  }
};

// =====================================================
// BUSCAR VALOR DE UM PARÂMETRO ESPECÍFICO (POR CÓDIGO)
// Endpoint mais usado: GET /parametros/valor/PEDIDO_PERGUNTA_QUANTIDADE
// =====================================================
export const buscarValorPorCodigo = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const { codigo } = req.params;
    
    const sql = `
      SELECT 
        pd.id_parametro,
        pd.codigo,
        pd.descricao,
        pd.tipo,
        pd.opcoes,
        pd.valor_padrao,
        COALESCE(pv.valor, pd.valor_padrao) as valor,
        CASE WHEN pv.id IS NOT NULL THEN true ELSE false END as customizado
      FROM public.parametros_definicoes pd
      LEFT JOIN parametros_valores pv
        ON pv.id_parametro = pd.id_parametro 
        AND pv.id_empresa = $1
      WHERE pd.codigo = $2 AND pd.ativo = true
    `;
    
    const result = await querySchema(req.empresa.schema, sql, [empresaId, codigo]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parâmetro não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao buscar valor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar valor do parâmetro'
    });
  }
};

// =====================================================
// SALVAR/ATUALIZAR VALOR DE PARÂMETRO
// =====================================================
export const salvarValor = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const userId = req.user.id;
    const { id_parametro, valor } = req.body;
    
    // Validações
    if (!id_parametro || valor === undefined || valor === null) {
      return res.status(400).json({
        success: false,
        message: 'ID do parâmetro e valor são obrigatórios'
      });
    }
    
    // Verificar se parâmetro existe
    const paramSql = `
      SELECT id_parametro, codigo, descricao, tipo, opcoes
      FROM parametros_definicoes
      WHERE id_parametro = $1 AND ativo = true
    `;
    const paramResult = await querySchema(req.empresa.schema, paramSql, [id_parametro]);
    
    if (paramResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parâmetro não encontrado'
      });
    }
    
    const parametro = paramResult.rows[0];
    
    // Validar valor conforme tipo
    const valorValidado = validarValor(parametro, valor);
    if (valorValidado.error) {
      return res.status(400).json({
        success: false,
        message: valorValidado.error
      });
    }
    
    // Verificar se já existe valor para esta empresa
    const checkSql = `
      SELECT id FROM parametros_valores 
      WHERE id_empresa = $1 AND id_parametro = $2
    `;
    const checkResult = await querySchema(req.empresa.schema, checkSql, [empresaId, id_parametro]);
    
    let result;
    let acao;

    if (checkResult.rows.length > 0) {
      // Atualizar
      const updateSql = `
        UPDATE parametros_valores
        SET valor = $1, updated_at = NOW(), updated_by = $2
        WHERE id_empresa = $3 AND id_parametro = $4
        RETURNING *
      `;
      result = await querySchema(req.empresa.schema, updateSql, [valorValidado.valor, userId, empresaId, id_parametro]);
      acao = 'ALTEROU';
    } else {
      // Inserir
      const insertSql = `
        INSERT INTO parametros_valores (id_empresa, id_parametro, valor, updated_by)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      result = await querySchema(req.empresa.schema, insertSql, [empresaId, id_parametro, valorValidado.valor, userId]);
      acao = 'CRIOU';
    }

    await registrarLog({
      req,
      acao,
      modulo: 'Parâmetros',
      id_registro: parametro.id_parametro,
      descricao: `${acao === 'CRIOU' ? 'Definiu' : 'Alterou'} o parâmetro "${parametro.descricao || parametro.codigo}" para "${valorValidado.valor}"`,
      dados_novos: { codigo: parametro.codigo, valor: valorValidado.valor }
    });

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
// SALVAR MÚLTIPLOS VALORES (BATCH)
// =====================================================
export const salvarMultiplosValores = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const userId = req.user.id;
    const { valores } = req.body;  // Array de { id_parametro, valor }
    
    if (!Array.isArray(valores) || valores.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Envie um array de valores'
      });
    }
    
    const resultados = [];
    
    for (const item of valores) {
      try {
        // Usar a mesma lógica de salvarValor
        const { id_parametro, valor } = item;
        
        // Buscar parâmetro
        const paramSql = `
          SELECT id_parametro, tipo, opcoes 
          FROM parametros_definicoes 
          WHERE id_parametro = $1
        `;
        const paramResult = await querySchema(req.empresa.schema, paramSql, [id_parametro]);
        
        if (paramResult.rows.length === 0) continue;
        
        const parametro = paramResult.rows[0];
        const valorValidado = validarValor(parametro, valor);
        
        if (valorValidado.error) {
          resultados.push({ id_parametro, success: false, error: valorValidado.error });
          continue;
        }
        
        // Upsert
        const upsertSql = `
          INSERT INTO parametros_valores (id_empresa, id_parametro, valor, updated_by)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id_empresa, id_parametro)
          DO UPDATE SET valor = $3, updated_at = NOW(), updated_by = $4
          RETURNING *
        `;
        
        await querySchema(req.empresa.schema, upsertSql, [empresaId, id_parametro, valorValidado.valor, userId]);
        resultados.push({ id_parametro, success: true });
        
      } catch (err) {
        resultados.push({ id_parametro: item.id_parametro, success: false, error: err.message });
      }
    }
    
    res.json({
      success: true,
      message: 'Valores processados',
      resultados: resultados
    });
    
  } catch (error) {
    console.error('Erro ao salvar múltiplos valores:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar valores'
    });
  }
};

// =====================================================
// RESETAR VALOR (voltar ao padrão)
// =====================================================
export const resetarValor = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const { id_parametro } = req.params;

    // Buscar nome do parâmetro para o log
    const paramResult = await querySchema(req.empresa.schema,
      'SELECT codigo, descricao FROM parametros_definicoes WHERE id_parametro = $1',
      [id_parametro]
    );
    const parametro = paramResult.rows[0];

    const sql = `
      DELETE FROM parametros_valores
      WHERE id_empresa = $1 AND id_parametro = $2
      RETURNING *
    `;

    const result = await querySchema(req.empresa.schema, sql, [empresaId, id_parametro]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Valor não encontrado (já está no padrão)'
      });
    }

    await registrarLog({
      req,
      acao: 'ALTEROU',
      modulo: 'Parâmetros',
      id_registro: id_parametro,
      descricao: `Resetou o parâmetro "${parametro?.descricao || parametro?.codigo || id_parametro}" para o valor padrão`
    });

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
        // Normalizar para S/N
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
        // Validar se valor está nas opções
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
