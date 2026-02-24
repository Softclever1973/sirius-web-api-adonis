// =====================================================
// SIRIUS WEB API - Controller de Produtos
// ADAPTADO PARA SCHEMA EXISTENTE
// VERSÃO CORRIGIDA - ORDENAÇÃO FUNCIONANDO
// =====================================================

import { query } from '../config/database.js';

// =====================================================
// LISTAR PRODUTOS (com paginação e filtros)
// =====================================================
export const listarProdutos = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    
    // Parâmetros de paginação
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Parâmetros de filtro
    const search = req.query.search || ''; // Busca geral (mantido para compatibilidade)
    const descricao = req.query.descricao || ''; // Filtro específico por descrição
    const codigo = req.query.codigo || ''; // Filtro específico por código
    const ean = req.query.ean || ''; // Filtro específico por EAN
    const ativo = req.query.ativo; // 'S', 'N' ou undefined (todos)
    const orderBy = req.query.orderBy || 'descricao';
    
    // ✅ CORREÇÃO: Aceitar tanto maiúsculo quanto minúsculo
    const orderDir = req.query.orderDir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    // Construir query com filtros
    let whereConditions = ['id_empresa = $1'];
    let queryParams = [empresaId];
    let paramCounter = 2;
    
    // Filtro geral (busca em todos os campos) - mantido para compatibilidade
    if (search) {
      whereConditions.push(`(
        descricao ILIKE $${paramCounter} OR 
        codigo ILIKE $${paramCounter} OR 
        ean ILIKE $${paramCounter}
      )`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Filtro específico por DESCRIÇÃO apenas
    if (descricao) {
      whereConditions.push(`descricao ILIKE $${paramCounter}`);
      queryParams.push(`%${descricao}%`);
      paramCounter++;
    }
    
    // Filtro específico por CÓDIGO apenas
    if (codigo) {
      whereConditions.push(`codigo ILIKE $${paramCounter}`);
      queryParams.push(`%${codigo}%`);
      paramCounter++;
    }
    
    // Filtro específico por EAN apenas
    if (ean) {
      whereConditions.push(`ean ILIKE $${paramCounter}`);
      queryParams.push(`%${ean}%`);
      paramCounter++;
    }
    
    // Converter S/N para A/I (ativo/inativo)
    if (ativo === 'S') {
      whereConditions.push(`status = 'A'`);
    } else if (ativo === 'N') {
      whereConditions.push(`status = 'I'`);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Query de contagem
    const countQuery = `
      SELECT COUNT(*) as total
      FROM produtos
      WHERE ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Query de dados
    const dataQuery = `
      SELECT 
        id_produto as id,
        codigo,
        ean as codigo_barras,
        descricao,
        descricao_complemento,
        unidade_comercial as unidade,
        custo as preco_custo,
        valor_venda as preco_venda,
        saldo as estoque_atual,
        estoque_minimo,
        estoque_maximo,
        ncm,
        cest,
        cfop,
        origem as origem_mercadoria,
        aliq_icms as icms_aliquota,
        cst_icms as icms_situacao_tributaria,
        aliq_pis as pis_aliquota,
        cst_pis as pis_situacao_tributaria,
        aliq_cofins as cofins_aliquota,
        cst_cofins as cofins_situacao_tributaria,
        CASE WHEN status = 'A' THEN 'S' ELSE 'N' END as ativo,
        ativo_pdv,
        observacoes,
        created_at as criado_em,
        updated_at as atualizado_em
      FROM produtos
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    queryParams.push(limit, offset);
    
    const dataResult = await query(dataQuery, queryParams);
    
    // Calcular metadados de paginação
    const totalPages = Math.ceil(total / limit);
    
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
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar produtos'
    });
  }
};

// =====================================================
// BUSCAR PRODUTO POR ID
// =====================================================
export const buscarProduto = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const produtoId = req.params.id;
    
    const result = await query(
      `SELECT 
        id_produto as id,
        codigo,
        ean as codigo_barras,
        descricao,
        descricao_complemento,
        unidade_comercial as unidade,
        custo as preco_custo,
        valor_venda as preco_venda,
        saldo as estoque_atual,
        estoque_minimo,
        estoque_maximo,
        ncm,
        cest,
        cfop,
        origem as origem_mercadoria,
        aliq_icms as icms_aliquota,
        cst_icms as icms_situacao_tributaria,
        aliq_pis as pis_aliquota,
        cst_pis as pis_situacao_tributaria,
        aliq_cofins as cofins_aliquota,
        cst_cofins as cofins_situacao_tributaria,
        CASE WHEN status = 'A' THEN 'S' ELSE 'N' END as ativo,
        ativo_pdv,
        observacoes,
        created_at as criado_em,
        updated_at as atualizado_em
       FROM produtos 
       WHERE id_produto = $1 AND id_empresa = $2`,
      [produtoId, empresaId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar produto'
    });
  }
};

// =====================================================
// CRIAR PRODUTO
// =====================================================
export const criarProduto = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const {
      codigo,
      codigo_barras,
      descricao,
      descricao_complemento,
      unidade,
      preco_custo,
      preco_venda,
      estoque_atual,
      estoque_minimo,
      estoque_maximo,
      ncm,
      cest,
      cfop,
      origem_mercadoria,
      icms_aliquota,
      icms_situacao_tributaria,
      pis_aliquota,
      pis_situacao_tributaria,
      cofins_aliquota,
      cofins_situacao_tributaria,
      ativo,
      ativo_pdv,
      observacoes
    } = req.body;
    
    // Validações obrigatórias
    if (!codigo || !descricao) {
      return res.status(400).json({
        success: false,
        message: 'Código e descrição são obrigatórios'
      });
    }
    
    // Verificar se código já existe
    const codigoExiste = await query(
      'SELECT id_produto FROM produtos WHERE codigo = $1 AND id_empresa = $2',
      [codigo, empresaId]
    );
    
    if (codigoExiste.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um produto com este código'
      });
    }
    
    // Converter ativo S/N para status A/I
    const status = (ativo === 'N') ? 'I' : 'A';
    
    // Inserir produto
    const result = await query(
      `INSERT INTO produtos (
        id_empresa,
        codigo,
        ean,
        descricao,
        descricao_complemento,
        unidade_comercial,
        custo,
        valor_venda,
        saldo,
        estoque_minimo,
        estoque_maximo,
        ncm,
        cest,
        cfop,
        origem,
        aliq_icms,
        cst_icms,
        aliq_pis,
        cst_pis,
        aliq_cofins,
        cst_cofins,
        status,
        ativo_pdv,
        observacoes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING 
        id_produto as id,
        codigo,
        ean as codigo_barras,
        descricao,
        descricao_complemento,
        unidade_comercial as unidade,
        custo as preco_custo,
        valor_venda as preco_venda,
        saldo as estoque_atual,
        estoque_minimo,
        estoque_maximo,
        ncm,
        cest,
        cfop,
        origem as origem_mercadoria,
        aliq_icms as icms_aliquota,
        cst_icms as icms_situacao_tributaria,
        aliq_pis as pis_aliquota,
        cst_pis as pis_situacao_tributaria,
        aliq_cofins as cofins_aliquota,
        cst_cofins as cofins_situacao_tributaria,
        CASE WHEN status = 'A' THEN 'S' ELSE 'N' END as ativo,
        ativo_pdv,
        observacoes,
        created_at as criado_em,
        updated_at as atualizado_em`,
      [
        empresaId,
        codigo,
        codigo_barras || null,
        descricao,
        descricao_complemento || null,
        unidade || 'UN',
        preco_custo || 0,
        preco_venda || 0,
        0, // ✅ Saldo sempre inicia em ZERO - será ajustado via movimentações
        estoque_minimo || 0,
        estoque_maximo || 0,
        ncm || null,
        cest || null,
        cfop || null,
        origem_mercadoria || null,
        icms_aliquota || 0,
        icms_situacao_tributaria || null,
        pis_aliquota || 0,
        pis_situacao_tributaria || null,
        cofins_aliquota || 0,
        cofins_situacao_tributaria || null,
        status,
        ativo_pdv !== undefined ? ativo_pdv : true,
        observacoes || null
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Produto criado com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar produto'
    });
  }
};

// =====================================================
// ATUALIZAR PRODUTO
// =====================================================
export const atualizarProduto = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const produtoId = req.params.id;
    const dados = req.body;
    
    // Verificar se produto existe
    const produtoExiste = await query(
      'SELECT id_produto FROM produtos WHERE id_produto = $1 AND id_empresa = $2',
      [produtoId, empresaId]
    );
    
    if (produtoExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }
    
    // Se mudou o código, verificar duplicidade
    if (dados.codigo) {
      const codigoExiste = await query(
        'SELECT id_produto FROM produtos WHERE codigo = $1 AND id_empresa = $2 AND id_produto != $3',
        [dados.codigo, empresaId, produtoId]
      );
      
      if (codigoExiste.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe outro produto com este código'
        });
      }
    }
    
    // Construir SET dinamicamente apenas com campos enviados
    const camposUpdate = [];
    const valoresUpdate = [];
    let paramCounter = 1;
    
    // Mapear campos do body para campos do banco
    // IMPORTANTE: estoque_atual (saldo) foi removido do mapeamento
    // O saldo só pode ser atualizado via movimentações de estoque
    const mapeamento = {
      'codigo': 'codigo',
      'codigo_barras': 'ean',
      'descricao': 'descricao',
      'descricao_complemento': 'descricao_complemento',
      'unidade': 'unidade_comercial',
      'preco_custo': 'custo',
      'preco_venda': 'valor_venda',
      // 'estoque_atual': 'saldo', // ❌ REMOVIDO - saldo não é mais editável aqui
      'estoque_minimo': 'estoque_minimo',
      'estoque_maximo': 'estoque_maximo',
      'ncm': 'ncm',
      'cest': 'cest',
      'cfop': 'cfop',
      'origem_mercadoria': 'origem',
      'icms_aliquota': 'aliq_icms',
      'icms_situacao_tributaria': 'cst_icms',
      'pis_aliquota': 'aliq_pis',
      'pis_situacao_tributaria': 'cst_pis',
      'cofins_aliquota': 'aliq_cofins',
      'cofins_situacao_tributaria': 'cst_cofins',
      'ativo_pdv': 'ativo_pdv',
      'observacoes': 'observacoes'
    };
    
    for (const [campoApi, campoBanco] of Object.entries(mapeamento)) {
      if (dados[campoApi] !== undefined) {
        camposUpdate.push(`${campoBanco} = $${paramCounter}`);
        valoresUpdate.push(dados[campoApi]);
        paramCounter++;
      }
    }
    
    // Tratamento especial para ativo (converter S/N para A/I)
    if (dados.ativo !== undefined) {
      camposUpdate.push(`status = $${paramCounter}`);
      valoresUpdate.push(dados.ativo === 'N' ? 'I' : 'A');
      paramCounter++;
    }
    
    if (camposUpdate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo para atualizar'
      });
    }
    
    // Adicionar id_produto e id_empresa aos parâmetros
    valoresUpdate.push(produtoId, empresaId);
    
    // Atualizar produto
    const updateQuery = `
      UPDATE produtos 
      SET ${camposUpdate.join(', ')}
      WHERE id_produto = $${paramCounter} AND id_empresa = $${paramCounter + 1}
      RETURNING 
        id_produto as id,
        codigo,
        ean as codigo_barras,
        descricao,
        descricao_complemento,
        unidade_comercial as unidade,
        custo as preco_custo,
        valor_venda as preco_venda,
        saldo as estoque_atual,
        estoque_minimo,
        estoque_maximo,
        ncm,
        cest,
        cfop,
        origem as origem_mercadoria,
        aliq_icms as icms_aliquota,
        cst_icms as icms_situacao_tributaria,
        aliq_pis as pis_aliquota,
        cst_pis as pis_situacao_tributaria,
        aliq_cofins as cofins_aliquota,
        cst_cofins as cofins_situacao_tributaria,
        CASE WHEN status = 'A' THEN 'S' ELSE 'N' END as ativo,
        ativo_pdv,
        observacoes,
        created_at as criado_em,
        updated_at as atualizado_em
    `;
    
    const result = await query(updateQuery, valoresUpdate);
    
    res.json({
      success: true,
      message: 'Produto atualizado com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar produto'
    });
  }
};

// =====================================================
// DELETAR PRODUTO (soft delete)
// =====================================================
export const deletarProduto = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const produtoId = req.params.id;
    
    // Verificar se produto existe
    const produtoExiste = await query(
      'SELECT id_produto FROM produtos WHERE id_produto = $1 AND id_empresa = $2',
      [produtoId, empresaId]
    );
    
    if (produtoExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }
    
    // Soft delete (marcar como inativo - status = 'I')
    await query(
      'UPDATE produtos SET status = $1 WHERE id_produto = $2 AND id_empresa = $3',
      ['I', produtoId, empresaId]
    );
    
    res.json({
      success: true,
      message: 'Produto inativado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar produto'
    });
  }
};

// =====================================================
// TOGGLE STATUS PRODUTO (Ativar / Inativar)
// PATCH /produtos/:id/toggle-status
// =====================================================
export const toggleStatusProduto = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const produtoId = req.params.id;

    // Buscar status atual
    const resultado = await query(
      'SELECT id_produto, status FROM produtos WHERE id_produto = $1 AND id_empresa = $2',
      [produtoId, empresaId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }

    const statusAtual = resultado.rows[0].status; // 'A' ou 'I'
    const novoStatus  = statusAtual === 'A' ? 'I' : 'A';
    const mensagem    = novoStatus === 'A' ? 'Produto ativado com sucesso' : 'Produto inativado com sucesso';

    await query(
      'UPDATE produtos SET status = $1 WHERE id_produto = $2 AND id_empresa = $3',
      [novoStatus, produtoId, empresaId]
    );

    res.json({
      success: true,
      message: mensagem,
      data: { status: novoStatus }
    });

  } catch (error) {
    console.error('Erro ao alternar status do produto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao alternar status do produto'
    });
  }
};
