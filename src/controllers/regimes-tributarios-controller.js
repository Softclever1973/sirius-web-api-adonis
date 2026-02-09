// =====================================================
// Controller de Regimes Tributários
// =====================================================

import { query } from '../config/database.js';

/**
 * GET /regimes-tributarios
 * Listar todos os regimes tributários (não é por empresa - é global)
 */
export const listarRegimesTributarios = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        id_rt,
        nome,
        descricao,
        created_at
       FROM regimes_tributarios 
       ORDER BY nome`
    );
    
    return res.status(200).json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Erro ao listar regimes tributários:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar regimes tributários'
    });
  }
};

/**
 * GET /regimes-tributarios/:id
 * Buscar regime tributário por ID
 */
export const buscarRegimeTributario = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT 
        id_rt,
        nome,
        descricao,
        created_at
       FROM regimes_tributarios 
       WHERE id_rt = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Regime tributário não encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao buscar regime tributário:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar regime tributário'
    });
  }
};

/**
 * POST /regimes-tributarios
 * Criar novo regime tributário
 */
export const criarRegimeTributario = async (req, res) => {
  try {
    const {
      nome,
      descricao
    } = req.body;
    
    // Validações básicas
    if (!nome) {
      return res.status(400).json({
        success: false,
        message: 'Nome é obrigatório'
      });
    }
    
    // Verificar se nome já existe
    const existente = await query(
      `SELECT id_rt FROM regimes_tributarios WHERE nome = $1`,
      [nome]
    );
    
    if (existente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um regime tributário com este nome'
      });
    }
    
    console.log('✅ Validações OK. Inserindo regime tributário');
    
    // Inserir regime tributário
    const result = await query(
      `INSERT INTO regimes_tributarios (
        nome,
        descricao
      ) VALUES ($1, $2)
      RETURNING *`,
      [nome, descricao]
    );
    
    console.log('✅ Regime tributário criado com sucesso! ID:', result.rows[0].id_rt);
    
    return res.status(201).json({
      success: true,
      message: 'Regime tributário criado com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar regime tributário:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao criar regime tributário'
    });
  }
};

/**
 * PUT /regimes-tributarios/:id
 * Atualizar regime tributário existente
 */
export const atualizarRegimeTributario = async (req, res) => {
  try {
    const { id } = req.params;
    
    const {
      nome,
      descricao
    } = req.body;
    
    // Validações básicas
    if (!nome) {
      return res.status(400).json({
        success: false,
        message: 'Nome é obrigatório'
      });
    }
    
    // Verificar se nome já existe para outro regime
    const existente = await query(
      `SELECT id_rt FROM regimes_tributarios 
       WHERE nome = $1 AND id_rt != $2`,
      [nome, id]
    );
    
    if (existente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe outro regime tributário com este nome'
      });
    }
    
    // Atualizar regime tributário
    const result = await query(
      `UPDATE regimes_tributarios SET
        nome = $1,
        descricao = $2
       WHERE id_rt = $3
       RETURNING *`,
      [nome, descricao, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Regime tributário não encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Regime tributário atualizado com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao atualizar regime tributário:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar regime tributário'
    });
  }
};

/**
 * DELETE /regimes-tributarios/:id
 * Excluir regime tributário
 */
export const excluirRegimeTributario = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `DELETE FROM regimes_tributarios 
       WHERE id_rt = $1
       RETURNING id_rt`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Regime tributário não encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Regime tributário excluído com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao excluir regime tributário:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao excluir regime tributário'
    });
  }
};
