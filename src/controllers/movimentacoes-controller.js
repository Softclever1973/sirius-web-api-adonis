// =====================================================
// SIRIUS WEB API - Controller de Movimentações de Estoque
// =====================================================

import { query, getClient } from '../config/database.js';

// =====================================================
// LISTAR MOVIMENTAÇÕES (com paginação)
// =====================================================
export const listarMovimentacoes = async (req, res) => {
  try {
    const empresaId = req.empresa.id;
    const produtoId = req.params.produtoId;
    
    // Parâmetros de paginação
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Parâmetro de ordenação
    const orderDir = req.query.orderDir === 'desc' ? 'DESC' : 'ASC';
    
    // Verificar se produto existe e pertence à empresa
    const produtoExiste = await query(
      'SELECT id_produto, descricao, saldo FROM produtos WHERE id_produto = $1 AND id_empresa = $2',
      [produtoId, empresaId]
    );
    
    if (produtoExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }
    
    const produto = produtoExiste.rows[0];
    
    // Query de contagem
    const countQuery = `
      SELECT COUNT(*) as total
      FROM movimentacoes_estoque
      WHERE id_empresa = $1 AND id_produto = $2
    `;
    
    const countResult = await query(countQuery, [empresaId, produtoId]);
    const total = parseInt(countResult.rows[0].total);
    
    // Query de dados
    const dataQuery = `
      SELECT 
        m.id_movimentacao,
        m.tipo,
        m.quantidade,
        m.saldo_anterior,
        m.saldo_atual,
        m.id_pedido_venda,
        m.id_pedido_compra,
        m.numero_nota_fiscal,
        m.observacao,
        m.created_at,
        u.nome || ' ' || u.sobrenome as usuario_nome
      FROM movimentacoes_estoque m
      LEFT JOIN usuarios u ON u.id_usuario = m.id_usuario
      WHERE m.id_empresa = $1 AND m.id_produto = $2
      ORDER BY m.created_at ${orderDir}, m.id_movimentacao ${orderDir}
      LIMIT $3 OFFSET $4
    `;
    
    const dataResult = await query(dataQuery, [empresaId, produtoId, limit, offset]);
    
    // Calcular metadados de paginação
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: {
        produto: {
          id: produto.id_produto,
          descricao: produto.descricao,
          saldo_atual: parseFloat(produto.saldo)
        },
        movimentacoes: dataResult.rows.map(mov => ({
          id: mov.id_movimentacao,
          tipo: mov.tipo,
          quantidade: parseFloat(mov.quantidade),
          saldo_anterior: parseFloat(mov.saldo_anterior),
          saldo_atual: parseFloat(mov.saldo_atual),
          pedido_venda_id: mov.id_pedido_venda,
          pedido_compra_id: mov.id_pedido_compra,
          nota_fiscal: mov.numero_nota_fiscal,
          observacao: mov.observacao,
          data: mov.created_at,
          usuario: mov.usuario_nome
        }))
      },
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
    console.error('Erro ao listar movimentações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar movimentações'
    });
  }
};

// =====================================================
// CRIAR MOVIMENTAÇÃO (Entrada ou Saída)
// =====================================================
export const criarMovimentacao = async (req, res) => {
  const client = await getClient();
  
  try {
    const empresaId = req.empresa.id;
    const usuarioId = req.user.id;
    const produtoId = req.params.produtoId;
    const { tipo, quantidade, observacao } = req.body;
    
    console.log('📝 Criando movimentação:', { empresaId, usuarioId, produtoId, tipo, quantidade });
    
    // Validações
    if (!tipo || !['ENTRADA', 'SAIDA'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo inválido. Use ENTRADA ou SAIDA'
      });
    }
    
    if (!quantidade || parseFloat(quantidade) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantidade deve ser maior que zero'
      });
    }
    
    // Iniciar transação
    await client.query('BEGIN');
    
    // Buscar produto com lock para evitar race condition
    const produtoResult = await client.query(
      'SELECT id_produto, descricao, saldo FROM produtos WHERE id_produto = $1 AND id_empresa = $2 FOR UPDATE',
      [produtoId, empresaId]
    );
    
    if (produtoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }
    
    const produto = produtoResult.rows[0];
    const saldoAnterior = parseFloat(produto.saldo);
    const qtd = parseFloat(quantidade);
    
    console.log('📦 Produto encontrado:', { id: produto.id_produto, saldo: saldoAnterior });
    
    // Calcular novo saldo
    let saldoAtual;
    if (tipo === 'ENTRADA') {
      saldoAtual = saldoAnterior + qtd;
    } else {
      saldoAtual = saldoAnterior - qtd;
      
      // Validar se há saldo suficiente
      if (saldoAtual < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Saldo insuficiente. Saldo atual: ${saldoAnterior}, Quantidade solicitada: ${qtd}`
        });
      }
    }
    
    console.log('💰 Saldos:', { anterior: saldoAnterior, atual: saldoAtual });
    
    // Inserir movimentação
    const movResult = await client.query(
      `INSERT INTO movimentacoes_estoque (
        id_empresa,
        id_produto,
        id_usuario,
        tipo,
        quantidade,
        saldo_anterior,
        saldo_atual,
        observacao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_movimentacao, created_at`,
      [empresaId, produtoId, usuarioId, tipo, qtd, saldoAnterior, saldoAtual, observacao || null]
    );
    
    const movimentacao = movResult.rows[0];
    console.log('✅ Movimentação inserida:', movimentacao.id_movimentacao);
    
    // Atualizar saldo do produto
    await client.query(
      'UPDATE produtos SET saldo = $1, updated_at = NOW() WHERE id_produto = $2 AND id_empresa = $3',
      [saldoAtual, produtoId, empresaId]
    );
    
    console.log('✅ Saldo do produto atualizado');
    
    // Commit da transação
    await client.query('COMMIT');
    console.log('✅ Transação commitada');
    
    // Buscar nome do usuário para retorno
    const usuarioResult = await query(
      'SELECT nome, sobrenome FROM usuarios WHERE id_usuario = $1',
      [usuarioId]
    );
    
    const usuario = usuarioResult.rows[0];
    
    const resposta = {
      success: true,
      message: `${tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} registrada com sucesso`,
      data: {
        id: movimentacao.id_movimentacao,
        tipo,
        quantidade: qtd,
        saldo_anterior: saldoAnterior,
        saldo_atual: saldoAtual,
        observacao: observacao || null,
        data: movimentacao.created_at,
        usuario: `${usuario.nome} ${usuario.sobrenome}`,
        produto: {
          id: produto.id_produto,
          descricao: produto.descricao
        }
      }
    };
    
    console.log('📤 Enviando resposta:', resposta);
    
    res.status(201).json(resposta);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao criar movimentação:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar movimentação',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};
