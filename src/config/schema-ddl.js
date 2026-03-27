// =====================================================
// DDL Template para criação de schemas por-empresa
// Cada empresa terá seu próprio schema com estas tabelas
// =====================================================

/**
 * Retorna o SQL completo para criar todas as tabelas
 * de um schema de empresa. O schema deve ser criado
 * ANTES de executar este SQL (via createEmpresaSchema).
 *
 * As tabelas conservam a coluna id_empresa como
 * camada de segurança adicional durante a transição.
 */
export function getTenantDDL(schemaName) {
  return `
    -- =====================================================
    -- Produtos
    -- =====================================================
    CREATE TABLE IF NOT EXISTS "${schemaName}".produtos (
      id_produto            SERIAL PRIMARY KEY,
      id_empresa            INTEGER NOT NULL,
      codigo                VARCHAR(50) NOT NULL,
      ean                   VARCHAR(20),
      descricao             VARCHAR(200) NOT NULL,
      descricao_complemento TEXT,
      unidade_comercial     VARCHAR(6) DEFAULT 'UN',
      custo                 NUMERIC(15,4) DEFAULT 0,
      valor_venda           NUMERIC(15,4) DEFAULT 0,
      saldo                 NUMERIC(15,4) DEFAULT 0,
      estoque_minimo        NUMERIC(15,4) DEFAULT 0,
      estoque_maximo        NUMERIC(15,4) DEFAULT 0,
      ncm                   VARCHAR(10),
      cest                  VARCHAR(10),
      cfop                  VARCHAR(5),
      origem                VARCHAR(2),
      aliq_icms             NUMERIC(7,4) DEFAULT 0,
      cst_icms              VARCHAR(5),
      aliq_pis              NUMERIC(7,4) DEFAULT 0,
      cst_pis               VARCHAR(3),
      aliq_cofins           NUMERIC(7,4) DEFAULT 0,
      cst_cofins            VARCHAR(3),
      status                CHAR(1) DEFAULT 'A',
      ativo_pdv             BOOLEAN DEFAULT true,
      observacoes           TEXT,
      created_at            TIMESTAMPTZ DEFAULT NOW(),
      updated_at            TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- Clientes
    -- =====================================================
    CREATE TABLE IF NOT EXISTS "${schemaName}".clientes (
      id_cliente            SERIAL PRIMARY KEY,
      id_empresa            INTEGER NOT NULL,
      tipo                  CHAR(1) NOT NULL,
      razao_social          VARCHAR(150) NOT NULL,
      nome_fantasia         VARCHAR(150),
      cpf                   VARCHAR(14),
      cnpj                  VARCHAR(18),
      id_estrangeiro        VARCHAR(20),
      ind_ie                VARCHAR(1),
      inscricao_estadual    VARCHAR(20),
      inscricao_municipal   VARCHAR(20),
      contato               VARCHAR(150),
      nome_contato          VARCHAR(150),
      id_vendedor           INTEGER,
      id_lista_preco        INTEGER,
      id_condicao_pagamento INTEGER,
      status                CHAR(1) DEFAULT 'A',
      created_at            TIMESTAMPTZ DEFAULT NOW(),
      updated_at            TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- Vendedores
    -- =====================================================
    CREATE TABLE IF NOT EXISTS "${schemaName}".vendedores (
      id_vendedor   SERIAL PRIMARY KEY,
      id_empresa    INTEGER NOT NULL,
      id_user       INTEGER,
      nome          VARCHAR(150) NOT NULL,
      cpf           VARCHAR(14),
      fone          VARCHAR(20),
      email         VARCHAR(150),
      endereco      VARCHAR(200),
      complemento   VARCHAR(100),
      cidade        VARCHAR(100),
      uf            CHAR(2),
      cep           VARCHAR(10),
      comissao      NUMERIC(7,4) DEFAULT 0,
      meta_vendas   NUMERIC(15,2) DEFAULT 0,
      status        CHAR(1) DEFAULT 'A',
      observacoes   TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- Formas de Pagamento
    -- =====================================================
    CREATE TABLE IF NOT EXISTS "${schemaName}".formas_pagamento (
      id_forma_pagamento SERIAL PRIMARY KEY,
      id_empresa         INTEGER NOT NULL,
      codigo             VARCHAR(2) NOT NULL,
      descricao          VARCHAR(100) NOT NULL,
      permite_troco      BOOLEAN DEFAULT false,
      ativo              BOOLEAN DEFAULT true,
      created_at         TIMESTAMPTZ DEFAULT NOW(),
      updated_at         TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- Movimentações de Estoque
    -- =====================================================
    CREATE TABLE IF NOT EXISTS "${schemaName}".movimentacoes_estoque (
      id_movimentacao    SERIAL PRIMARY KEY,
      id_empresa         INTEGER NOT NULL,
      id_produto         INTEGER NOT NULL,
      id_usuario         INTEGER,
      tipo               VARCHAR(10) NOT NULL,
      quantidade         NUMERIC(15,4) NOT NULL,
      saldo_anterior     NUMERIC(15,4) NOT NULL,
      saldo_atual        NUMERIC(15,4) NOT NULL,
      id_pedido_venda    INTEGER,
      id_pedido_compra   INTEGER,
      numero_nota_fiscal VARCHAR(20),
      observacao         TEXT,
      created_at         TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- Pedidos de Venda
    -- =====================================================
    CREATE TABLE IF NOT EXISTS "${schemaName}".pedidos_venda (
      id_pedido_venda  SERIAL PRIMARY KEY,
      id_empresa       INTEGER NOT NULL,
      numero           INTEGER NOT NULL,
      id_cliente       INTEGER,
      nome_cliente     VARCHAR(200),
      cpf_cnpj_cliente VARCHAR(20),
      id_usuario       INTEGER,
      valor_bruto      NUMERIC(15,4) DEFAULT 0,
      desconto         NUMERIC(15,4) DEFAULT 0,
      acrescimo        NUMERIC(15,4) DEFAULT 0,
      valor_liquido    NUMERIC(15,4) DEFAULT 0,
      status           CHAR(1) DEFAULT 'F',
      observacoes      TEXT,
      data_finalizacao TIMESTAMPTZ,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- Itens dos Pedidos de Venda
    -- =====================================================
    CREATE TABLE IF NOT EXISTS "${schemaName}".pedidos_venda_itens (
      id_item               SERIAL PRIMARY KEY,
      id_pedido_venda       INTEGER NOT NULL,
      id_empresa            INTEGER NOT NULL,
      id_produto            INTEGER,
      codigo_produto        VARCHAR(50),
      descricao             VARCHAR(200),
      descricao_complemento TEXT,
      ean                   VARCHAR(20),
      unidade               VARCHAR(6),
      quantidade            NUMERIC(15,4) NOT NULL,
      valor_unitario        NUMERIC(15,4) NOT NULL,
      valor_total           NUMERIC(15,4) NOT NULL,
      sequencia             INTEGER,
      created_at            TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- Pagamentos dos Pedidos de Venda
    -- =====================================================
    CREATE TABLE IF NOT EXISTS "${schemaName}".pedidos_venda_pagamentos (
      id_pagamento       SERIAL PRIMARY KEY,
      id_pedido_venda    INTEGER NOT NULL,
      id_empresa         INTEGER NOT NULL,
      id_forma_pagamento INTEGER,
      valor              NUMERIC(15,4) NOT NULL,
      troco              NUMERIC(15,4) DEFAULT 0,
      created_at         TIMESTAMPTZ DEFAULT NOW()
    );

    -- =====================================================
    -- Parâmetros Valores (overrides por empresa)
    -- parametros_definicoes continua em public
    -- =====================================================
    CREATE TABLE IF NOT EXISTS "${schemaName}".parametros_valores (
      id           SERIAL PRIMARY KEY,
      id_parametro INTEGER NOT NULL,
      id_empresa   INTEGER NOT NULL,
      valor        TEXT,
      updated_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_by   INTEGER,
      UNIQUE (id_empresa, id_parametro)
    );

    -- =====================================================
    -- Log de Auditoria
    -- =====================================================
    CREATE TABLE IF NOT EXISTS "${schemaName}".logs_auditoria (
      id_log           BIGSERIAL PRIMARY KEY,
      id_empresa       INTEGER NOT NULL,
      id_usuario       INTEGER,
      nome_usuario     VARCHAR(200),
      acao             VARCHAR(20) NOT NULL,
      modulo           VARCHAR(50) NOT NULL,
      id_registro      VARCHAR(100),
      descricao        TEXT,
      dados_anteriores JSONB,
      dados_novos      JSONB,
      ip_address       VARCHAR(45),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_${schemaName}_logs_created_at"
      ON "${schemaName}".logs_auditoria (created_at DESC);

    CREATE INDEX IF NOT EXISTS "idx_${schemaName}_logs_modulo"
      ON "${schemaName}".logs_auditoria (modulo);
  `;
}

/**
 * Cria o schema e todas as tabelas para uma nova empresa.
 * Deve ser chamado dentro de uma transação (client já com BEGIN).
 *
 * @param {object} client - Cliente pg com transação ativa
 * @param {string} schemaName - Nome do schema (ex: 'emp_42')
 */
export async function createEmpresaSchema(client, schemaName) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  await client.query(getTenantDDL(schemaName));
}
