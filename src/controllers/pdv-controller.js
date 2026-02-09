// =====================================================
// SIRIUS WEB API - Controller de PDV
// =====================================================

import { query } from '../config/database.js';

// =====================================================
// BUSCAR CLIENTES PARA PDV
// Permite busca por razÃ£o social ou CNPJ
// =====================================================
export const buscarClientes = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const { termo } = req.query; // termo de busca
    
    if (!termo || termo.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Remove caracteres especiais do CNPJ/CPF para comparaÃ§Ã£o
    const termoLimpo = termo.replace(/[^\d]/g, '');
    
    const sql = `
      SELECT 
        id_cliente as id,
        razao_social,
        nome_fantasia,
        cpf,
        cnpj,
        tipo,
        CASE 
          WHEN tipo = 'J' THEN cnpj
          WHEN tipo = 'F' THEN cpf
          ELSE ''
        END as documento
      FROM clientes
      WHERE id_empresa = $1 
        AND status = 'A'
        AND (
          razao_social ILIKE $2
          OR nome_fantasia ILIKE $2
          OR REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') ILIKE $3
          OR REPLACE(REPLACE(cpf, '.', ''), '-', '') ILIKE $3
        )
      ORDER BY razao_social
      LIMIT 20
    `;
    
    const result = await query(sql, [empresaId, `%${termo}%`, `%${termoLimpo}%`]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar clientes'
    });
  }
};

// =====================================================
// BUSCAR PRODUTOS PARA PDV
// Permite busca por cÃ³digo, EAN ou descriÃ§Ã£o
// =====================================================
export const buscarProdutos = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const { termo } = req.query;
    
    if (!termo || termo.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const sql = `
      SELECT 
        id_produto as id,
        codigo,
        ean,
        descricao,
        descricao_complemento,
        unidade_comercial as unidade,
        valor_venda as preco,
        saldo as estoque,
        ativo_pdv
      FROM produtos
      WHERE id_empresa = $1 
        AND status = 'A'
        AND ativo_pdv = true
        AND (
          codigo ILIKE $2
          OR ean ILIKE $2
          OR descricao ILIKE $2
        )
      ORDER BY descricao
      LIMIT 20
    `;
    
    const result = await query(sql, [empresaId, `%${termo}%`]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar produtos'
    });
  }
};

// =====================================================
// OBTER PRIMEIRO CLIENTE (Consumidor Final)
// =====================================================
export const obterPrimeiroCliente = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    
    const sql = `
      SELECT 
        id_cliente as id,
        razao_social,
        nome_fantasia,
        tipo,
        CASE 
          WHEN tipo = 'J' THEN cnpj
          WHEN tipo = 'F' THEN cpf
          ELSE ''
        END as documento
      FROM clientes
      WHERE id_empresa = $1 
        AND status = 'A'
      ORDER BY id_cliente ASC
      LIMIT 1
    `;
    
    const result = await query(sql, [empresaId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum cliente cadastrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao obter primeiro cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter cliente padrÃ£o'
    });
  }
};

// =====================================================
// LISTAR FORMAS DE PAGAMENTO ATIVAS
// =====================================================
export const listarFormasPagamento = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    
    const sql = `
      SELECT 
        id_forma_pagamento as id,
        codigo,
        descricao,
        permite_troco
      FROM formas_pagamento
      WHERE id_empresa = $1 
        AND ativo = true
      ORDER BY descricao
    `;
    
    const result = await query(sql, [empresaId]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Erro ao listar formas de pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar formas de pagamento'
    });
  }
};

// =====================================================
// OBTER PRÃ“XIMO NÃšMERO DE PEDIDO
// =====================================================
export const obterProximoNumero = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    
    const sql = `
      SELECT COALESCE(MAX(numero), 0) + 1 as proximo_numero
      FROM pedidos_venda
      WHERE id_empresa = $1
    `;
    
    const result = await query(sql, [empresaId]);
    
    res.json({
      success: true,
      data: {
        numero: result.rows[0].proximo_numero
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter prÃ³ximo nÃºmero:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter prÃ³ximo nÃºmero'
    });
  }
};

// =====================================================
// VALIDAR ESTOQUE ANTES DE FINALIZAR
// =====================================================
const validarEstoque = async (empresaId, itens) => {
  for (const item of itens) {
    const sql = `
      SELECT saldo
      FROM produtos
      WHERE id_empresa = $1 AND id_produto = $2
    `;
    
    const result = await query(sql, [empresaId, item.id_produto]);
    
    if (result.rows.length === 0) {
      throw new Error(`Produto ${item.descricao} nÃ£o encontrado`);
    }
    
    const saldoAtual = parseFloat(result.rows[0].saldo);
    
    if (saldoAtual < parseFloat(item.quantidade)) {
      throw new Error(
        `Estoque insuficiente para ${item.descricao}. ` +
        `DisponÃ­vel: ${saldoAtual} - Solicitado: ${item.quantidade}`
      );
    }
  }
};

// =====================================================
// DAR BAIXA NO ESTOQUE
// =====================================================
const darBaixaEstoque = async (empresaId, usuarioId, pedidoId, itens) => {
  for (const item of itens) {
    // 1. Atualizar saldo do produto
    const updateSql = `
      UPDATE produtos
      SET saldo = saldo - $1,
          updated_at = NOW()
      WHERE id_empresa = $2 
        AND id_produto = $3
    `;
    
    await query(updateSql, [item.quantidade, empresaId, item.id_produto]);
    
    // 2. Registrar movimentaÃ§Ã£o
    const movSql = `
      INSERT INTO movimentacoes_estoque (
        id_empresa,
        id_produto,
        id_usuario,
        tipo,
        quantidade,
        saldo_anterior,
        saldo_atual,
        observacao,
        id_pedido_venda
      )
      SELECT 
        $1,
        $2,
        $3,
        'S',
        $4,
        saldo + $4,
        saldo,
        $5,
        $6
      FROM produtos
      WHERE id_produto = $2
    `;
    
    const observacao = `Venda - Pedido #${pedidoId}`;
    
    await query(movSql, [
      empresaId,
      item.id_produto,
      usuarioId,
      item.quantidade,
      observacao,
      pedidoId
    ]);
  }
};

// =====================================================
// FINALIZAR PEDIDO
// =====================================================
export const finalizarPedido = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const usuarioId = req.user.id; // â† CORRIGIDO: req.user ao invÃ©s de req.usuario
    const {
      numero,
      cliente,
      itens,
      pagamentos,
      valor_bruto,
      desconto,
      acrescimo,
      valor_liquido,
      observacoes
    } = req.body;
    
    // ValidaÃ§Ãµes
    if (!cliente || !cliente.id) {
      return res.status(400).json({
        success: false,
        message: 'Cliente nÃ£o informado'
      });
    }
    
    if (!itens || itens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum item no pedido'
      });
    }
    
    if (!pagamentos || pagamentos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma forma de pagamento informada'
      });
    }
    
    // Validar se o total dos pagamentos confere
    const totalPago = pagamentos.reduce((sum, p) => sum + parseFloat(p.valor), 0);
    if (Math.abs(totalPago - parseFloat(valor_liquido)) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Total dos pagamentos nÃ£o confere com o valor do pedido'
      });
    }
    
    // Validar estoque
    await validarEstoque(empresaId, itens);
    
    // Buscar dados do cliente
    const clienteData = await query(
      `SELECT razao_social, 
              CASE WHEN tipo = 'J' THEN cnpj ELSE cpf END as documento
       FROM clientes 
       WHERE id_cliente = $1`,
      [cliente.id]
    );
    
    // Iniciar transaÃ§Ã£o
    await query('BEGIN');
    
    try {
      // 1. Criar pedido de venda
      const pedidoSql = `
        INSERT INTO pedidos_venda (
          id_empresa,
          numero,
          id_cliente,
          nome_cliente,
          cpf_cnpj_cliente,
          id_usuario,
          valor_bruto,
          desconto,
          acrescimo,
          valor_liquido,
          status,
          observacoes,
          data_finalizacao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'F', $11, NOW())
        RETURNING id_pedido_venda
      `;
      
      const pedidoResult = await query(pedidoSql, [
        empresaId,
        numero,
        cliente.id,
        clienteData.rows[0].razao_social,
        clienteData.rows[0].documento,
        usuarioId,
        valor_bruto,
        desconto || 0,
        acrescimo || 0,
        valor_liquido,
        observacoes || null
      ]);
      
      const pedidoId = pedidoResult.rows[0].id_pedido_venda;
      
      // 2. Inserir itens
      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        
        const itemSql = `
          INSERT INTO pedidos_venda_itens (
            id_pedido_venda,
            id_empresa,
            id_produto,
            codigo_produto,
            descricao,
            descricao_complemento,
            ean,
            unidade,
            quantidade,
            valor_unitario,
            valor_total,
            sequencia
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
        
        await query(itemSql, [
          pedidoId,
          empresaId,
          item.id_produto,
          item.codigo || null,
          item.descricao,
          item.descricao_complemento || null,
          item.ean || null,
          item.unidade,
          item.quantidade,
          item.valor_unitario,
          item.valor_total,
          i + 1
        ]);
      }
      
      // 3. Inserir pagamentos
      for (const pagamento of pagamentos) {
        const pagSql = `
          INSERT INTO pedidos_venda_pagamentos (
            id_pedido_venda,
            id_empresa,
            id_forma_pagamento,
            valor,
            troco
          ) VALUES ($1, $2, $3, $4, $5)
        `;
        
        await query(pagSql, [
          pedidoId,
          empresaId,
          pagamento.id_forma_pagamento,
          pagamento.valor,
          pagamento.troco || 0
        ]);
      }
      
      // 4. Dar baixa no estoque
      await darBaixaEstoque(empresaId, usuarioId, pedidoId, itens);
      
      // Commit da transaÃ§Ã£o
      await query('COMMIT');
      
      res.json({
        success: true,
        message: 'Pedido finalizado com sucesso',
        data: {
          id_pedido: pedidoId,
          numero: numero
        }
      });
      
    } catch (error) {
      // Rollback em caso de erro
      await query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Erro ao finalizar pedido:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao finalizar pedido'
    });
  }
};

// =====================================================
// LISTAR PEDIDOS
// =====================================================
export const listarPedidos = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Parâmetros de filtro
    const ordenacao = req.query.ordenacao || 'numero_desc';
    const filtroPorNumero = req.query.numero;
    const filtroHoje = req.query.hoje === 'true';
    const dataInicial = req.query.data_inicial;
    const idCliente = req.query.id_cliente;
    
    // Construir WHERE clause
    let whereConditions = ['p.id_empresa = $1'];
    let params = [empresaId];
    let paramCount = 1;
    
    // Filtro por número
    if (filtroPorNumero) {
      paramCount++;
      whereConditions.push(`p.numero = $${paramCount}`);
      params.push(filtroPorNumero);
    }
    
    // Filtro por hoje
    if (filtroHoje) {
      whereConditions.push(`DATE(p.created_at) = CURRENT_DATE`);
    }
    
    // Filtro por data inicial
    if (dataInicial) {
      paramCount++;
      whereConditions.push(`DATE(p.created_at) >= $${paramCount}`);
      params.push(dataInicial);
    }
    
    // Filtro por cliente
    if (idCliente) {
      paramCount++;
      whereConditions.push(`p.id_cliente = $${paramCount}`);
      params.push(idCliente);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Definir ordenação
    let orderClause = 'p.id_pedido_venda DESC'; // padrão
    if (ordenacao === 'numero_asc') {
      orderClause = 'p.numero ASC';
    } else if (ordenacao === 'numero_desc') {
      orderClause = 'p.numero DESC';
    }
    
    // Contagem
    const countSql = `
      SELECT COUNT(*) as total
      FROM pedidos_venda p
      WHERE ${whereClause}
    `;
    
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Dados
    const sql = `
      SELECT 
        p.id_pedido_venda as id,
        p.numero,
        p.nome_cliente,
        p.cpf_cnpj_cliente,
        p.valor_liquido,
        p.status,
        p.created_at,
        p.data_finalizacao,
        u.nome || ' ' || u.sobrenome as usuario
      FROM pedidos_venda p
      LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(limit, offset);
    const result = await query(sql, params);
    
    const totalPages = Math.ceil(total / limit);
    
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
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar pedidos'
    });
  }
};

// =====================================================
// BUSCAR PEDIDO POR ID
// =====================================================
export const buscarPedido = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const { id } = req.params;
    
    // Buscar pedido
    const pedidoSql = `
      SELECT 
        p.*,
        c.razao_social as cliente_razao_social,
        c.nome_fantasia as cliente_nome_fantasia,
        u.nome || ' ' || u.sobrenome as usuario
      FROM pedidos_venda p
      LEFT JOIN clientes c ON c.id_cliente = p.id_cliente
      LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario
      WHERE p.id_empresa = $1 AND p.id_pedido_venda = $2
    `;
    
    const pedidoResult = await query(pedidoSql, [empresaId, id]);
    
    if (pedidoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pedido nÃ£o encontrado'
      });
    }
    
    // Buscar itens
    const itensSql = `
      SELECT *
      FROM pedidos_venda_itens
      WHERE id_pedido_venda = $1
      ORDER BY sequencia
    `;
    
    const itensResult = await query(itensSql, [id]);
    
    // Buscar pagamentos
    const pagamentosSql = `
      SELECT 
        pp.*,
        fp.descricao as forma_pagamento_descricao
      FROM pedidos_venda_pagamentos pp
      LEFT JOIN formas_pagamento fp ON fp.id_forma_pagamento = pp.id_forma_pagamento
      WHERE pp.id_pedido_venda = $1
    `;
    
    const pagamentosResult = await query(pagamentosSql, [id]);
    
    const pedido = {
      ...pedidoResult.rows[0],
      itens: itensResult.rows,
      pagamentos: pagamentosResult.rows
    };
    
    res.json({
      success: true,
      data: pedido
    });
    
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar pedido'
    });
  }
};
