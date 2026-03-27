// =====================================================
// Controller de Formas de Pagamento
// =====================================================

import { query } from '../config/database.js';

/**
 * GET /formas-pagamento
 * Listar todas as formas de pagamento da empresa
 */
export const listarFormasPagamento = async (req, res) => {
  try {
    // Buscar id_empresa de múltiplas fontes possíveis
    const idEmpresa = req.empresaId || req.empresa?.id || req.user?.id_empresa;
    
    // Debug
    console.log('🔍 [listarFormasPagamento] ID Empresa:', idEmpresa);
    
    if (!idEmpresa) {
      console.error('❌ ID da empresa não encontrado!');
      return res.status(400).json({
        success: false,
        message: 'Erro ao identificar empresa'
      });
    }
    
    const result = await querySchema(req.empresa.schema, 
      `SELECT 
        id_forma_pagamento,
        id_empresa,
        codigo,
        descricao,
        permite_troco,
        ativo,
        created_at
       FROM formas_pagamento 
       WHERE id_empresa = $1 
       ORDER BY codigo`,
      [idEmpresa]
    );
    
    return res.status(200).json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Erro ao listar formas de pagamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar formas de pagamento'
    });
  }
};

/**
 * GET /formas-pagamento/:id
 * Buscar forma de pagamento por ID
 */
export const buscarFormaPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar id_empresa de múltiplas fontes possíveis
    const idEmpresa = req.empresaId || req.empresa?.id || req.user?.id_empresa;
    
    // Debug
    console.log('🔍 [buscarFormaPagamento] ID Empresa:', idEmpresa);
    
    if (!idEmpresa) {
      console.error('❌ ID da empresa não encontrado!');
      return res.status(400).json({
        success: false,
        message: 'Erro ao identificar empresa'
      });
    }
    
    const result = await querySchema(req.empresa.schema, 
      `SELECT 
        id_forma_pagamento,
        id_empresa,
        codigo,
        descricao,
        permite_troco,
        ativo,
        created_at
       FROM formas_pagamento 
       WHERE id_forma_pagamento = $1 AND id_empresa = $2`,
      [id, idEmpresa]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Forma de pagamento não encontrada'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao buscar forma de pagamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar forma de pagamento'
    });
  }
};

/**
 * POST /formas-pagamento
 * Criar nova forma de pagamento
 */
export const criarFormaPagamento = async (req, res) => {
  try {
    // Buscar id_empresa de múltiplas fontes possíveis
    const idEmpresa = req.empresaId || req.empresa?.id || req.user?.id_empresa;
    
    // Debug detalhado
    console.log('🔍 [criarFormaPagamento] Debug completo:');
    console.log('   req.empresaId:', req.empresaId);
    console.log('   req.empresa:', req.empresa);
    console.log('   req.user:', req.user);
    console.log('   ID Empresa final:', idEmpresa);
    
    // Validação crítica
    if (!idEmpresa) {
      console.error('❌ ID da empresa não encontrado!');
      return res.status(400).json({
        success: false,
        message: 'Erro ao identificar empresa. Verifique a autenticação.'
      });
    }
    
    const {
      codigo,
      descricao,
      permite_troco,
      ativo
    } = req.body;
    
    // Validações básicas
    if (!codigo) {
      return res.status(400).json({
        success: false,
        message: 'Código é obrigatório'
      });
    }
    
    if (!descricao) {
      return res.status(400).json({
        success: false,
        message: 'Descrição é obrigatória'
      });
    }
    
    // Verificar se código já existe para esta empresa
    const existente = await querySchema(req.empresa.schema, 
      `SELECT id_forma_pagamento FROM formas_pagamento 
       WHERE id_empresa = $1 AND codigo = $2`,
      [idEmpresa, codigo]
    );
    
    if (existente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma forma de pagamento com este código'
      });
    }
    
    console.log('✅ Validações OK. Inserindo forma de pagamento com id_empresa:', idEmpresa);
    
    // Inserir forma de pagamento
    const result = await querySchema(req.empresa.schema, 
      `INSERT INTO formas_pagamento (
        id_empresa,
        codigo,
        descricao,
        permite_troco,
        ativo
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        idEmpresa,
        codigo,
        descricao,
        permite_troco !== undefined ? permite_troco : false,
        ativo !== undefined ? ativo : true
      ]
    );
    
    console.log('✅ Forma de pagamento criada com sucesso! ID:', result.rows[0].id_forma_pagamento);
    
    return res.status(201).json({
      success: true,
      message: 'Forma de pagamento criada com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar forma de pagamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao criar forma de pagamento'
    });
  }
};

/**
 * PUT /formas-pagamento/:id
 * Atualizar forma de pagamento existente
 */
export const atualizarFormaPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar id_empresa de múltiplas fontes possíveis
    const idEmpresa = req.empresaId || req.empresa?.id || req.user?.id_empresa;
    
    // Debug
    console.log('🔍 [atualizarFormaPagamento] ID Empresa:', idEmpresa);
    
    if (!idEmpresa) {
      console.error('❌ ID da empresa não encontrado!');
      return res.status(400).json({
        success: false,
        message: 'Erro ao identificar empresa'
      });
    }
    
    const {
      codigo,
      descricao,
      permite_troco,
      ativo
    } = req.body;
    
    // Validações básicas
    if (!codigo) {
      return res.status(400).json({
        success: false,
        message: 'Código é obrigatório'
      });
    }
    
    if (!descricao) {
      return res.status(400).json({
        success: false,
        message: 'Descrição é obrigatória'
      });
    }
    
    // Verificar se código já existe para outra forma de pagamento desta empresa
    const existente = await querySchema(req.empresa.schema, 
      `SELECT id_forma_pagamento FROM formas_pagamento 
       WHERE id_empresa = $1 AND codigo = $2 AND id_forma_pagamento != $3`,
      [idEmpresa, codigo, id]
    );
    
    if (existente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe outra forma de pagamento com este código'
      });
    }
    
    // Atualizar forma de pagamento
    const result = await querySchema(req.empresa.schema, 
      `UPDATE formas_pagamento SET
        codigo = $1,
        descricao = $2,
        permite_troco = $3,
        ativo = $4
       WHERE id_forma_pagamento = $5 AND id_empresa = $6
       RETURNING *`,
      [
        codigo,
        descricao,
        permite_troco !== undefined ? permite_troco : false,
        ativo !== undefined ? ativo : true,
        id,
        idEmpresa
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Forma de pagamento não encontrada'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Forma de pagamento atualizada com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao atualizar forma de pagamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar forma de pagamento'
    });
  }
};

/**
 * DELETE /formas-pagamento/:id
 * Excluir forma de pagamento
 */
export const excluirFormaPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar id_empresa de múltiplas fontes possíveis
    const idEmpresa = req.empresaId || req.empresa?.id || req.user?.id_empresa;
    
    // Debug
    console.log('🔍 [excluirFormaPagamento] ID Empresa:', idEmpresa);
    
    if (!idEmpresa) {
      console.error('❌ ID da empresa não encontrado!');
      return res.status(400).json({
        success: false,
        message: 'Erro ao identificar empresa'
      });
    }
    
    const result = await querySchema(req.empresa.schema, 
      `DELETE FROM formas_pagamento 
       WHERE id_forma_pagamento = $1 AND id_empresa = $2
       RETURNING id_forma_pagamento`,
      [id, idEmpresa]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Forma de pagamento não encontrada'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Forma de pagamento excluída com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao excluir forma de pagamento:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao excluir forma de pagamento'
    });
  }
};
