// =====================================================
// SIRIUS WEB API - Controller de Clientes
// =====================================================

import { query } from '../config/database.js';

// =====================================================
// LISTAR CLIENTES (com paginação e filtros)
// =====================================================
export const listarClientes = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    
    // Parâmetros de paginação
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Parâmetros de filtro
    const search = req.query.search || '';
    const ativo = req.query.ativo; // 'S', 'N' ou undefined (todos)
    const tipo = req.query.tipo; // 'F', 'J' ou undefined (todos)
    const orderBy = req.query.orderBy || 'razao_social';
    const orderDir = req.query.orderDir === 'desc' ? 'DESC' : 'ASC';
    
    // Construir query com filtros
    let whereConditions = ['id_empresa = $1'];
    let queryParams = [empresaId];
    let paramCounter = 2;
    
    if (search) {
      whereConditions.push(`(
        razao_social ILIKE $${paramCounter} OR 
        nome_fantasia ILIKE $${paramCounter} OR 
        cpf ILIKE $${paramCounter} OR 
        cnpj ILIKE $${paramCounter}
      )`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    if (ativo === 'S') {
      whereConditions.push(`status = 'A'`);
    } else if (ativo === 'N') {
      whereConditions.push(`status = 'I'`);
    }
    
    if (tipo === 'F' || tipo === 'J') {
      whereConditions.push(`tipo = '${tipo}'`);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Query de contagem
    const countQuery = `
      SELECT COUNT(*) as total
      FROM clientes
      WHERE ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Query de dados
    const dataQuery = `
      SELECT 
        id_cliente as id,
        tipo,
        razao_social,
        nome_fantasia,
        cpf,
        cnpj,
        id_estrangeiro,
        ind_ie as indicador_ie,
        inscricao_estadual,
        inscricao_municipal,
        contato,
        nome_contato,
        id_vendedor,
        id_lista_preco,
        id_condicao_pagamento,
        CASE WHEN status = 'A' THEN 'S' ELSE 'N' END as ativo,
        created_at as criado_em,
        updated_at as atualizado_em
      FROM clientes
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
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar clientes'
    });
  }
};

// =====================================================
// BUSCAR CLIENTE POR ID
// =====================================================
export const buscarCliente = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const clienteId = req.params.id;
    
    const result = await query(
      `SELECT 
        id_cliente as id,
        tipo,
        razao_social,
        nome_fantasia,
        cpf,
        cnpj,
        id_estrangeiro,
        ind_ie as indicador_ie,
        inscricao_estadual,
        inscricao_municipal,
        contato,
        nome_contato,
        id_vendedor,
        id_lista_preco,
        id_condicao_pagamento,
        CASE WHEN status = 'A' THEN 'S' ELSE 'N' END as ativo,
        created_at as criado_em,
        updated_at as atualizado_em
       FROM clientes 
       WHERE id_cliente = $1 AND id_empresa = $2`,
      [clienteId, empresaId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar cliente'
    });
  }
};

// =====================================================
// CRIAR CLIENTE
// =====================================================
export const criarCliente = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const {
      tipo,
      razao_social,
      nome_fantasia,
      cpf,
      cnpj,
      id_estrangeiro,
      indicador_ie,
      inscricao_estadual,
      inscricao_municipal,
      contato,
      nome_contato,
      id_vendedor,
      id_lista_preco,
      id_condicao_pagamento,
      ativo
    } = req.body;
    
    // Validações obrigatórias
    if (!tipo || !razao_social) {
      return res.status(400).json({
        success: false,
        message: 'Tipo e razão social são obrigatórios'
      });
    }
    
    // Validar tipo
    if (tipo !== 'F' && tipo !== 'J') {
      return res.status(400).json({
        success: false,
        message: 'Tipo deve ser F (Pessoa Física) ou J (Pessoa Jurídica)'
      });
    }
    
    // Validar CPF ou CNPJ dependendo do tipo
    if (tipo === 'F' && !cpf) {
      return res.status(400).json({
        success: false,
        message: 'CPF é obrigatório para Pessoa Física'
      });
    }
    
    if (tipo === 'J' && !cnpj) {
      return res.status(400).json({
        success: false,
        message: 'CNPJ é obrigatório para Pessoa Jurídica'
      });
    }
    
    // Verificar se CPF/CNPJ já existe
    if (tipo === 'F' && cpf) {
      const cpfExiste = await query(
        'SELECT id_cliente FROM clientes WHERE cpf = $1 AND id_empresa = $2',
        [cpf, empresaId]
      );
      
      if (cpfExiste.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe um cliente com este CPF'
        });
      }
    }
    
    if (tipo === 'J' && cnpj) {
      const cnpjExiste = await query(
        'SELECT id_cliente FROM clientes WHERE cnpj = $1 AND id_empresa = $2',
        [cnpj, empresaId]
      );
      
      if (cnpjExiste.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe um cliente com este CNPJ'
        });
      }
    }
    
    // Converter ativo S/N para status A/I
    const status = (ativo === 'N') ? 'I' : 'A';
    
    // Inserir cliente
    const result = await query(
      `INSERT INTO clientes (
        id_empresa,
        tipo,
        razao_social,
        nome_fantasia,
        cpf,
        cnpj,
        id_estrangeiro,
        ind_ie,
        inscricao_estadual,
        inscricao_municipal,
        contato,
        nome_contato,
        id_vendedor,
        id_lista_preco,
        id_condicao_pagamento,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING 
        id_cliente as id,
        tipo,
        razao_social,
        nome_fantasia,
        cpf,
        cnpj,
        id_estrangeiro,
        ind_ie as indicador_ie,
        inscricao_estadual,
        inscricao_municipal,
        contato,
        nome_contato,
        id_vendedor,
        id_lista_preco,
        id_condicao_pagamento,
        CASE WHEN status = 'A' THEN 'S' ELSE 'N' END as ativo,
        created_at as criado_em,
        updated_at as atualizado_em`,
      [
        empresaId,
        tipo,
        razao_social,
        nome_fantasia || null,
        cpf || null,
        cnpj || null,
        id_estrangeiro || null,
        indicador_ie || null,
        inscricao_estadual || null,
        inscricao_municipal || null,
        contato || null,
        nome_contato || null,
        id_vendedor || null,
        id_lista_preco || null,
        id_condicao_pagamento || null,
        status
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Cliente criado com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar cliente'
    });
  }
};

// =====================================================
// ATUALIZAR CLIENTE
// =====================================================
export const atualizarCliente = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const clienteId = req.params.id;
    const dados = req.body;
    
    // Verificar se cliente existe
    const clienteExiste = await query(
      'SELECT id_cliente FROM clientes WHERE id_cliente = $1 AND id_empresa = $2',
      [clienteId, empresaId]
    );
    
    if (clienteExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }
    
    // Se mudou o CPF, verificar duplicidade
    if (dados.cpf) {
      const cpfExiste = await query(
        'SELECT id_cliente FROM clientes WHERE cpf = $1 AND id_empresa = $2 AND id_cliente != $3',
        [dados.cpf, empresaId, clienteId]
      );
      
      if (cpfExiste.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe outro cliente com este CPF'
        });
      }
    }
    
    // Se mudou o CNPJ, verificar duplicidade
    if (dados.cnpj) {
      const cnpjExiste = await query(
        'SELECT id_cliente FROM clientes WHERE cnpj = $1 AND id_empresa = $2 AND id_cliente != $3',
        [dados.cnpj, empresaId, clienteId]
      );
      
      if (cnpjExiste.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe outro cliente com este CNPJ'
        });
      }
    }
    
    // Construir SET dinamicamente apenas com campos enviados
    const camposUpdate = [];
    const valoresUpdate = [];
    let paramCounter = 1;
    
    // Mapear campos do body para campos do banco
    const mapeamento = {
      'tipo': 'tipo',
      'razao_social': 'razao_social',
      'nome_fantasia': 'nome_fantasia',
      'cpf': 'cpf',
      'cnpj': 'cnpj',
      'id_estrangeiro': 'id_estrangeiro',
      'indicador_ie': 'ind_ie',
      'inscricao_estadual': 'inscricao_estadual',
      'inscricao_municipal': 'inscricao_municipal',
      'contato': 'contato',
      'nome_contato': 'nome_contato',
      'id_vendedor': 'id_vendedor',
      'id_lista_preco': 'id_lista_preco',
      'id_condicao_pagamento': 'id_condicao_pagamento'
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
    
    // Adicionar updated_at
    camposUpdate.push(`updated_at = NOW()`);
    
    if (camposUpdate.length === 1) { // Só tem o updated_at
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo para atualizar'
      });
    }
    
    // Adicionar id_cliente e id_empresa aos parâmetros
    valoresUpdate.push(clienteId, empresaId);
    
    // Atualizar cliente
    const updateQuery = `
      UPDATE clientes 
      SET ${camposUpdate.join(', ')}
      WHERE id_cliente = $${paramCounter} AND id_empresa = $${paramCounter + 1}
      RETURNING 
        id_cliente as id,
        tipo,
        razao_social,
        nome_fantasia,
        cpf,
        cnpj,
        id_estrangeiro,
        ind_ie as indicador_ie,
        inscricao_estadual,
        inscricao_municipal,
        contato,
        nome_contato,
        id_vendedor,
        id_lista_preco,
        id_condicao_pagamento,
        CASE WHEN status = 'A' THEN 'S' ELSE 'N' END as ativo,
        created_at as criado_em,
        updated_at as atualizado_em
    `;
    
    const result = await query(updateQuery, valoresUpdate);
    
    res.json({
      success: true,
      message: 'Cliente atualizado com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar cliente'
    });
  }
};

// =====================================================
// DELETAR CLIENTE (soft delete)
// =====================================================
export const deletarCliente = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const clienteId = req.params.id;
    
    // Verificar se cliente existe
    const clienteExiste = await query(
      'SELECT id_cliente FROM clientes WHERE id_cliente = $1 AND id_empresa = $2',
      [clienteId, empresaId]
    );
    
    if (clienteExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }
    
    // Soft delete (marcar como inativo - status = 'I')
    await query(
      'UPDATE clientes SET status = $1, updated_at = NOW() WHERE id_cliente = $2 AND id_empresa = $3',
      ['I', clienteId, empresaId]
    );
    
    res.json({
      success: true,
      message: 'Cliente inativado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar cliente'
    });
  }
};
