// =====================================================
// SIRIUS WEB - Rotas de Consulta de Pedidos
// =====================================================

import express from 'express';
import { authenticateToken } from '../middlewares/auth-middleware.js';
import { setTenant } from '../middlewares/tenant-middleware.js';
import pool from '../config/database.js';

const router = express.Router();

// Aplicar middlewares
router.use(authenticateToken);
router.use(setTenant);

// =====================================================
// LISTAR PEDIDOS COM FILTROS E PAGINAÇÃO
// =====================================================
router.get('/pedidos', async (req, res) => {
    try {
        const empresaId = req.empresaId;
        const {
            page = 1,
            limit = 20,
            ordenacao = 'numero_desc',
            numero,
            hoje,
            data_inicial,
            id_cliente
        } = req.query;

        const offset = (page - 1) * limit;

        // Construir query base
        let whereConditions = ['p.id_empresa = $1'];
        let queryParams = [empresaId];
        let paramCounter = 2;

        // Filtro por número
        if (numero) {
            whereConditions.push(`p.numero = $${paramCounter}`);
            queryParams.push(numero);
            paramCounter++;
        }

        // Filtro por hoje
        if (hoje === 'true') {
            whereConditions.push(`DATE(p.created_at) = CURRENT_DATE`);
        }

        // Filtro por data inicial
        if (data_inicial) {
            whereConditions.push(`DATE(p.created_at) >= $${paramCounter}`);
            queryParams.push(data_inicial);
            paramCounter++;
        }

        // Filtro por cliente
        if (id_cliente) {
            whereConditions.push(`p.id_cliente = $${paramCounter}`);
            queryParams.push(id_cliente);
            paramCounter++;
        }

        const whereClause = whereConditions.join(' AND ');

        // Definir ordenação
        let orderBy = 'p.numero DESC';
        if (ordenacao === 'numero_asc') orderBy = 'p.numero ASC';
        if (ordenacao === 'numero_desc') orderBy = 'p.numero DESC';
        if (ordenacao === 'data_asc') orderBy = 'p.created_at ASC';
        if (ordenacao === 'data_desc') orderBy = 'p.created_at DESC';

        // Consultar pedidos
        const queryPedidos = `
            SELECT 
                p.id,
                p.numero,
                p.id_cliente,
                p.status,
                p.valor_bruto,
                p.desconto,
                p.acrescimo,
                p.valor_liquido,
                p.observacoes,
                p.created_at,
                p.updated_at,
                c.razao_social as nome_cliente,
                c.documento as cpf_cnpj_cliente
            FROM pedidos p
            LEFT JOIN clientes c ON p.id_cliente = c.id
            WHERE ${whereClause}
            ORDER BY ${orderBy}
            LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
        `;

        queryParams.push(parseInt(limit), offset);

        const resultPedidos = await pool.query(queryPedidos, queryParams);

        // Contar total de registros
        const queryCount = `
            SELECT COUNT(*) as total
            FROM pedidos p
            WHERE ${whereClause}
        `;

        const resultCount = await pool.query(queryCount, queryParams.slice(0, paramCounter - 1));
        const total = parseInt(resultCount.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: resultPedidos.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar pedidos',
            error: error.message
        });
    }
});

// =====================================================
// BUSCAR DETALHES DE UM PEDIDO ESPECÍFICO
// =====================================================
router.get('/pedidos/:id', async (req, res) => {
    try {
        const empresaId = req.empresaId;
        const { id } = req.params;

        // Buscar dados do pedido
        const queryPedido = `
            SELECT 
                p.*,
                c.razao_social as nome_cliente,
                c.documento as cpf_cnpj_cliente,
                c.nome_fantasia,
                u.nome as usuario
            FROM pedidos p
            LEFT JOIN clientes c ON p.id_cliente = c.id
            LEFT JOIN usuarios u ON p.id_usuario = u.id
            WHERE p.id = $1 AND p.id_empresa = $2
        `;

        const resultPedido = await pool.query(queryPedido, [id, empresaId]);

        if (resultPedido.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }

        const pedido = resultPedido.rows[0];

        // Buscar itens do pedido
        const queryItens = `
            SELECT 
                pi.*,
                p.descricao,
                p.codigo as codigo_produto,
                p.unidade
            FROM pedidos_itens pi
            LEFT JOIN produtos p ON pi.id_produto = p.id
            WHERE pi.id_pedido = $1
            ORDER BY pi.id
        `;

        const resultItens = await pool.query(queryItens, [id]);

        // Buscar pagamentos do pedido
        const queryPagamentos = `
            SELECT 
                pp.*,
                fp.descricao
            FROM pedidos_pagamentos pp
            LEFT JOIN formas_pagamento fp ON pp.id_forma_pagamento = fp.id
            WHERE pp.id_pedido = $1
            ORDER BY pp.id
        `;

        const resultPagamentos = await pool.query(queryPagamentos, [id]);

        // Montar resposta completa
        pedido.itens = resultItens.rows;
        pedido.pagamentos = resultPagamentos.rows;

        res.json({
            success: true,
            data: pedido
        });

    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar pedido',
            error: error.message
        });
    }
});

// =====================================================
// CANCELAR PEDIDO
// =====================================================
router.put('/pedidos/:id/cancelar', async (req, res) => {
    try {
        const empresaId = req.empresaId;
        const { id } = req.params;
        const { motivo } = req.body;

        // Verificar se o pedido existe e pertence à empresa
        const queryVerificar = `
            SELECT status FROM pedidos 
            WHERE id = $1 AND id_empresa = $2
        `;

        const resultVerificar = await pool.query(queryVerificar, [id, empresaId]);

        if (resultVerificar.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }

        if (resultVerificar.rows[0].status === 'C') {
            return res.status(400).json({
                success: false,
                message: 'Pedido já está cancelado'
            });
        }

        // Cancelar o pedido
        const queryCancelar = `
            UPDATE pedidos 
            SET status = 'C',
                observacoes = CONCAT(COALESCE(observacoes, ''), '\nMotivo do Cancelamento: ', $1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND id_empresa = $3
            RETURNING *
        `;

        const resultCancelar = await pool.query(queryCancelar, [motivo || 'Sem motivo informado', id, empresaId]);

        res.json({
            success: true,
            message: 'Pedido cancelado com sucesso',
            data: resultCancelar.rows[0]
        });

    } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao cancelar pedido',
            error: error.message
        });
    }
});

export default router;
