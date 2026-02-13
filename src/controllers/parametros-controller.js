// =====================================================
// SIRIUS WEB API - Parâmetros Controller
// =====================================================

import { query } from '../config/database.js';

// =====================================================
// LISTAR PARÂMETROS (com paginação e filtros)
// =====================================================
export const listarParametros = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    
    // Filtros opcionais
    const { parametro, modulo, tabela } = req.query;
    
    // Construir WHERE dinâmico
    let whereConditions = ['id_empresa = $1'];
    let queryParams = [empresaId];
    let paramIndex = 2;
    
    if (parametro) {
      whereConditions.push(`parametro ILIKE $${paramIndex}`);
      queryParams.push(`%${parametro}%`);
      paramIndex++;
    }
    
    if (modulo) {
      whereConditions.push(`modulo = $${paramIndex}`);
      queryParams.push(modulo);
      paramIndex++;
    }
    
    if (tabela) {
      whereConditions.push(`tabela ILIKE $${paramIndex}`);
      queryParams.push(`%${tabela}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Contar total
    const countSql = `
      SELECT COUNT(*) as total
      FROM parametros
      WHERE ${whereClause}
    `;
    
    const countResult = await query(countSql, queryParams);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    // Buscar dados
    const sql = `
      SELECT 
        id_parametro,
        parametro,
        descricao,
        descricaocomplementar,
        opcoes,
        modulo,
        tabela,
        created_at,
        updated_at
      FROM parametros
      WHERE ${whereClause}
      ORDER BY parametro ASC
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
    console.error('Erro ao listar parâmetros:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar parâmetros'
    });
  }
};

// =====================================================
// BUSCAR PARÂMETRO POR ID
// =====================================================
export const buscarParametro = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const { id } = req.params;
    
    const sql = `
      SELECT 
        id_parametro,
        parametro,
        descricao,
        descricaocomplementar,
        opcoes,
        modulo,
        tabela,
        created_at,
        updated_at
      FROM parametros
      WHERE id_empresa = $1 AND id_parametro = $2
    `;
    
    const result = await query(sql, [empresaId, id]);
    
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
    console.error('Erro ao buscar parâmetro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar parâmetro'
    });
  }
};

// =====================================================
// CRIAR PARÂMETRO
// =====================================================
export const criarParametro = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const {
      parametro,
      descricao,
      descricaocomplementar,
      opcoes,
      modulo,
      tabela
    } = req.body;
    
    // Validações
    if (!parametro || !parametro.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Identificador do parâmetro é obrigatório'
      });
    }
    
    // Verificar se já existe parâmetro com mesmo identificador
    const checkSql = `
      SELECT id_parametro
      FROM parametros
      WHERE id_empresa = $1 AND parametro = $2
    `;
    
    const checkResult = await query(checkSql, [empresaId, parametro]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um parâmetro com este identificador'
      });
    }
    
    // Inserir
    const sql = `
      INSERT INTO parametros (
        id_empresa,
        parametro,
        descricao,
        descricaocomplementar,
        opcoes,
        modulo,
        tabela
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await query(sql, [
      empresaId,
      parametro.trim(),
      descricao?.trim() || null,
      descricaocomplementar?.trim() || null,
      opcoes?.trim() || null,
      modulo?.trim() || null,
      tabela?.trim() || null
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Parâmetro criado com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao criar parâmetro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar parâmetro'
    });
  }
};

// =====================================================
// ATUALIZAR PARÂMETRO
// =====================================================
export const atualizarParametro = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const { id } = req.params;
    const {
      parametro,
      descricao,
      descricaocomplementar,
      opcoes,
      modulo,
      tabela
    } = req.body;
    
    // Validações
    if (!parametro || !parametro.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Identificador do parâmetro é obrigatório'
      });
    }
    
    // Verificar se parâmetro existe
    const checkSql = `
      SELECT id_parametro
      FROM parametros
      WHERE id_empresa = $1 AND id_parametro = $2
    `;
    
    const checkResult = await query(checkSql, [empresaId, id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parâmetro não encontrado'
      });
    }
    
    // Verificar duplicidade (exceto o próprio)
    const dupSql = `
      SELECT id_parametro
      FROM parametros
      WHERE id_empresa = $1 AND parametro = $2 AND id_parametro != $3
    `;
    
    const dupResult = await query(dupSql, [empresaId, parametro, id]);
    
    if (dupResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe outro parâmetro com este identificador'
      });
    }
    
    // Atualizar
    const sql = `
      UPDATE parametros
      SET 
        parametro = $1,
        descricao = $2,
        descricaocomplementar = $3,
        opcoes = $4,
        modulo = $5,
        tabela = $6,
        updated_at = now()
      WHERE id_empresa = $7 AND id_parametro = $8
      RETURNING *
    `;
    
    const result = await query(sql, [
      parametro.trim(),
      descricao?.trim() || null,
      descricaocomplementar?.trim() || null,
      opcoes?.trim() || null,
      modulo?.trim() || null,
      tabela?.trim() || null,
      empresaId,
      id
    ]);
    
    res.json({
      success: true,
      message: 'Parâmetro atualizado com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao atualizar parâmetro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar parâmetro'
    });
  }
};

// =====================================================
// EXCLUIR PARÂMETRO
// =====================================================
export const excluirParametro = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const { id } = req.params;
    
    // Verificar se parâmetro existe
    const checkSql = `
      SELECT id_parametro
      FROM parametros
      WHERE id_empresa = $1 AND id_parametro = $2
    `;
    
    const checkResult = await query(checkSql, [empresaId, id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parâmetro não encontrado'
      });
    }
    
    // Excluir
    const sql = `
      DELETE FROM parametros
      WHERE id_empresa = $1 AND id_parametro = $2
    `;
    
    await query(sql, [empresaId, id]);
    
    res.json({
      success: true,
      message: 'Parâmetro excluído com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao excluir parâmetro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir parâmetro'
    });
  }
};
