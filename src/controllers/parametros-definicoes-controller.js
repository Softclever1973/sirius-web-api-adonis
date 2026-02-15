// =====================================================
// SIRIUS WEB API - Controller de Definições de Parâmetros
// Gerencia os parâmetros GLOBAIS do sistema
// =====================================================

import { query } from '../config/database.js';

// =====================================================
// LISTAR DEFINIÇÕES DE PARÂMETROS
// =====================================================
export const listarDefinicoes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Filtros opcionais
    const { modulo, ativo, search } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (modulo) {
      whereConditions.push(`modulo = $${paramIndex}`);
      queryParams.push(modulo);
      paramIndex++;
    }
    
    if (ativo !== undefined) {
      whereConditions.push(`ativo = $${paramIndex}`);
      queryParams.push(ativo === 'true');
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`(codigo ILIKE $${paramIndex} OR descricao ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Contar total
    const countSql = `SELECT COUNT(*) as total FROM parametros_definicoes ${whereClause}`;
    const countResult = await query(countSql, queryParams);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    // Buscar dados
    const sql = `
      SELECT *
      FROM parametros_definicoes
      ${whereClause}
      ORDER BY modulo, ordem, descricao
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const result = await query(sql, queryParams);
    
    res.json({
      success: true,
      data: result.rows,
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
    console.error('Erro ao listar definições:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar definições de parâmetros'
    });
  }
};

// =====================================================
// BUSCAR DEFINIÇÃO POR ID
// =====================================================
export const buscarDefinicao = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sql = `SELECT * FROM parametros_definicoes WHERE id_parametro = $1`;
    const result = await query(sql, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Definição de parâmetro não encontrada'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao buscar definição:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar definição'
    });
  }
};

// =====================================================
// BUSCAR DEFINIÇÃO POR CÓDIGO
// =====================================================
export const buscarDefinicaoPorCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;
    
    const sql = `SELECT * FROM parametros_definicoes WHERE codigo = $1`;
    const result = await query(sql, [codigo]);
    
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
    console.error('Erro ao buscar por código:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar parâmetro'
    });
  }
};

// =====================================================
// CRIAR DEFINIÇÃO DE PARÂMETRO
// =====================================================
export const criarDefinicao = async (req, res) => {
  try {
    const {
      codigo,
      descricao,
      descricao_complementar,
      tipo,
      opcoes,
      valor_padrao,
      modulo,
      tabela_relacionada,
      obrigatorio,
      ordem,
      observacoes
    } = req.body;
    
    // Validações
    if (!codigo || !descricao || !tipo) {
      return res.status(400).json({
        success: false,
        message: 'Código, descrição e tipo são obrigatórios'
      });
    }
    
    // Verificar se código já existe
    const checkSql = `SELECT id_parametro FROM parametros_definicoes WHERE codigo = $1`;
    const checkResult = await query(checkSql, [codigo]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um parâmetro com este código'
      });
    }
    
    // Inserir
    const sql = `
      INSERT INTO parametros_definicoes (
        codigo, descricao, descricao_complementar, tipo, opcoes,
        valor_padrao, modulo, tabela_relacionada, obrigatorio, ordem, observacoes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await query(sql, [
      codigo.toUpperCase().trim(),
      descricao.trim(),
      descricao_complementar?.trim() || null,
      tipo,
      opcoes || null,
      valor_padrao || null,
      modulo || null,
      tabela_relacionada || null,
      obrigatorio || false,
      ordem || 0,
      observacoes || null
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Definição de parâmetro criada com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao criar definição:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar definição'
    });
  }
};

// =====================================================
// ATUALIZAR DEFINIÇÃO
// =====================================================
export const atualizarDefinicao = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      descricao,
      descricao_complementar,
      tipo,
      opcoes,
      valor_padrao,
      modulo,
      tabela_relacionada,
      obrigatorio,
      ordem,
      ativo,
      observacoes
    } = req.body;
    
    // Verificar se existe
    const checkSql = `SELECT id_parametro FROM parametros_definicoes WHERE id_parametro = $1`;
    const checkResult = await query(checkSql, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Definição não encontrada'
      });
    }
    
    // Atualizar
    const sql = `
      UPDATE parametros_definicoes
      SET 
        descricao = $1,
        descricao_complementar = $2,
        tipo = $3,
        opcoes = $4,
        valor_padrao = $5,
        modulo = $6,
        tabela_relacionada = $7,
        obrigatorio = $8,
        ordem = $9,
        ativo = $10,
        observacoes = $11,
        updated_at = NOW()
      WHERE id_parametro = $12
      RETURNING *
    `;
    
    const result = await query(sql, [
      descricao,
      descricao_complementar || null,
      tipo,
      opcoes || null,
      valor_padrao || null,
      modulo || null,
      tabela_relacionada || null,
      obrigatorio !== undefined ? obrigatorio : false,
      ordem !== undefined ? ordem : 0,
      ativo !== undefined ? ativo : true,
      observacoes || null,
      id
    ]);
    
    res.json({
      success: true,
      message: 'Definição atualizada com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao atualizar definição:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar definição'
    });
  }
};

// =====================================================
// EXCLUIR DEFINIÇÃO (cuidado!)
// =====================================================
export const excluirDefinicao = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se existe
    const checkSql = `SELECT id_parametro FROM parametros_definicoes WHERE id_parametro = $1`;
    const checkResult = await query(checkSql, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Definição não encontrada'
      });
    }
    
    // Verificar se há valores configurados
    const valuesSql = `SELECT COUNT(*) as total FROM parametros_valores WHERE id_parametro = $1`;
    const valuesResult = await query(valuesSql, [id]);
    const totalValores = parseInt(valuesResult.rows[0].total);
    
    if (totalValores > 0) {
      return res.status(400).json({
        success: false,
        message: `Não é possível excluir. Existem ${totalValores} empresa(s) com este parâmetro configurado.`
      });
    }
    
    // Excluir
    const sql = `DELETE FROM parametros_definicoes WHERE id_parametro = $1`;
    await query(sql, [id]);
    
    res.json({
      success: true,
      message: 'Definição excluída com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao excluir definição:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir definição'
    });
  }
};
