-- =====================================================
-- SIRIUS WEB — Setup Fresh: Schema por Empresa
-- Use este script quando NÃO precisa migrar dados.
-- Execute no Supabase SQL Editor.
-- =====================================================

BEGIN;

-- 1. Adicionar coluna schema_name em empresas
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS schema_name VARCHAR(50);

-- 2. Criar schema + tabelas para cada empresa existente
DO $$
DECLARE
  emp RECORD;
  s   TEXT;
BEGIN
  FOR emp IN SELECT id_empresa FROM empresas ORDER BY id_empresa LOOP
    s := 'emp_' || emp.id_empresa;

    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', s);

    -- produtos
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.produtos (
      id_produto SERIAL PRIMARY KEY, id_empresa INTEGER NOT NULL,
      codigo VARCHAR(50) NOT NULL, ean VARCHAR(20), descricao VARCHAR(200) NOT NULL,
      descricao_complemento TEXT, unidade_comercial VARCHAR(6) DEFAULT ''UN'',
      custo NUMERIC(15,4) DEFAULT 0, valor_venda NUMERIC(15,4) DEFAULT 0,
      saldo NUMERIC(15,4) DEFAULT 0, estoque_minimo NUMERIC(15,4) DEFAULT 0,
      estoque_maximo NUMERIC(15,4) DEFAULT 0, ncm VARCHAR(10), cest VARCHAR(10),
      cfop VARCHAR(5), origem VARCHAR(2), aliq_icms NUMERIC(7,4) DEFAULT 0,
      cst_icms VARCHAR(5), aliq_pis NUMERIC(7,4) DEFAULT 0, cst_pis VARCHAR(3),
      aliq_cofins NUMERIC(7,4) DEFAULT 0, cst_cofins VARCHAR(3),
      status CHAR(1) DEFAULT ''A'', ativo_pdv BOOLEAN DEFAULT true,
      observacoes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW())', s);

    -- clientes
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.clientes (
      id_cliente SERIAL PRIMARY KEY, id_empresa INTEGER NOT NULL,
      tipo CHAR(1) NOT NULL, razao_social VARCHAR(150) NOT NULL,
      nome_fantasia VARCHAR(150), cpf VARCHAR(14), cnpj VARCHAR(18),
      id_estrangeiro VARCHAR(20), ind_ie VARCHAR(1),
      inscricao_estadual VARCHAR(20), inscricao_municipal VARCHAR(20),
      contato VARCHAR(150), nome_contato VARCHAR(150),
      id_vendedor INTEGER, id_lista_preco INTEGER, id_condicao_pagamento INTEGER,
      status CHAR(1) DEFAULT ''A'',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())', s);

    -- vendedores
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.vendedores (
      id_vendedor SERIAL PRIMARY KEY, id_empresa INTEGER NOT NULL,
      id_user INTEGER, nome VARCHAR(150) NOT NULL, cpf VARCHAR(14),
      fone VARCHAR(20), email VARCHAR(150), endereco VARCHAR(200),
      complemento VARCHAR(100), cidade VARCHAR(100), uf CHAR(2), cep VARCHAR(10),
      comissao NUMERIC(7,4) DEFAULT 0, meta_vendas NUMERIC(15,2) DEFAULT 0,
      status CHAR(1) DEFAULT ''A'', observacoes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())', s);

    -- formas_pagamento
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.formas_pagamento (
      id_forma_pagamento SERIAL PRIMARY KEY, id_empresa INTEGER NOT NULL,
      codigo VARCHAR(2) NOT NULL, descricao VARCHAR(100) NOT NULL,
      permite_troco BOOLEAN DEFAULT false, ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())', s);

    -- movimentacoes_estoque
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.movimentacoes_estoque (
      id_movimentacao SERIAL PRIMARY KEY, id_empresa INTEGER NOT NULL,
      id_produto INTEGER NOT NULL, id_usuario INTEGER, tipo VARCHAR(10) NOT NULL,
      quantidade NUMERIC(15,4) NOT NULL, saldo_anterior NUMERIC(15,4) NOT NULL,
      saldo_atual NUMERIC(15,4) NOT NULL, id_pedido_venda INTEGER,
      id_pedido_compra INTEGER, numero_nota_fiscal VARCHAR(20), observacao TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW())', s);

    -- pedidos_venda
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.pedidos_venda (
      id_pedido_venda SERIAL PRIMARY KEY, id_empresa INTEGER NOT NULL,
      numero INTEGER NOT NULL, id_cliente INTEGER, nome_cliente VARCHAR(200),
      cpf_cnpj_cliente VARCHAR(20), id_usuario INTEGER,
      valor_bruto NUMERIC(15,4) DEFAULT 0, desconto NUMERIC(15,4) DEFAULT 0,
      acrescimo NUMERIC(15,4) DEFAULT 0, valor_liquido NUMERIC(15,4) DEFAULT 0,
      status CHAR(1) DEFAULT ''F'', observacoes TEXT, data_finalizacao TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())', s);

    -- pedidos_venda_itens
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.pedidos_venda_itens (
      id_item SERIAL PRIMARY KEY, id_pedido_venda INTEGER NOT NULL,
      id_empresa INTEGER NOT NULL, id_produto INTEGER,
      codigo_produto VARCHAR(50), descricao VARCHAR(200),
      descricao_complemento TEXT, ean VARCHAR(20), unidade VARCHAR(6),
      quantidade NUMERIC(15,4) NOT NULL, valor_unitario NUMERIC(15,4) NOT NULL,
      valor_total NUMERIC(15,4) NOT NULL, sequencia INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW())', s);

    -- pedidos_venda_pagamentos
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.pedidos_venda_pagamentos (
      id SERIAL PRIMARY KEY, id_pedido_venda INTEGER NOT NULL,
      id_empresa INTEGER NOT NULL, id_forma_pagamento INTEGER,
      valor NUMERIC(15,4) NOT NULL, troco NUMERIC(15,4) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW())', s);

    -- parametros_valores
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.parametros_valores (
      id SERIAL PRIMARY KEY, id_parametro INTEGER NOT NULL,
      id_empresa INTEGER NOT NULL, valor TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(), updated_by INTEGER,
      UNIQUE (id_empresa, id_parametro))', s);

    -- logs_auditoria
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I.logs_auditoria (
      id_log BIGSERIAL PRIMARY KEY, id_empresa INTEGER NOT NULL,
      id_usuario INTEGER, nome_usuario VARCHAR(200),
      acao VARCHAR(20) NOT NULL, modulo VARCHAR(50) NOT NULL,
      id_registro VARCHAR(100), descricao TEXT,
      dados_anteriores JSONB, dados_novos JSONB, ip_address VARCHAR(45),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())', s);

    -- Salvar schema_name
    UPDATE empresas SET schema_name = s WHERE id_empresa = emp.id_empresa;

    RAISE NOTICE 'Empresa % → schema % criado.', emp.id_empresa, s;
  END LOOP;
END;
$$;

-- 3. Verificação
SELECT id_empresa, razao_social, schema_name,
       CASE WHEN schema_name IS NOT NULL THEN '✓ OK' ELSE '✗ FALHOU' END AS status
FROM empresas
ORDER BY id_empresa;

COMMIT;
