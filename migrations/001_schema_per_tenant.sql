-- =====================================================
-- SIRIUS WEB — Migração: Schema por Empresa
-- Execute este script COMPLETO no Supabase SQL Editor
-- em uma única transação para garantir atomicidade.
--
-- O que este script faz:
--   1. Adiciona a coluna schema_name em empresas
--   2. Para cada empresa existente:
--      a. Cria um schema isolado (emp_{id})
--      b. Cria todas as tabelas no novo schema
--      c. Migra os dados existentes
--      d. Atualiza schema_name na tabela empresas
--
-- ATENÇÃO: Faça um backup completo antes de executar!
-- =====================================================

BEGIN;

-- =====================================================
-- PASSO 1: Adicionar coluna schema_name em empresas
-- =====================================================
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS schema_name VARCHAR(50);

-- =====================================================
-- PASSO 2: Função auxiliar para criar schema de empresa
-- =====================================================
CREATE OR REPLACE FUNCTION criar_schema_empresa(p_empresa_id INTEGER)
RETURNS void AS $$
DECLARE
  v_schema TEXT := 'emp_' || p_empresa_id;
BEGIN
  -- Criar schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_schema);

  -- Criar tabelas copiando estrutura exata do public (colunas + defaults + constraints)
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I.produtos                (LIKE public.produtos                INCLUDING DEFAULTS INCLUDING CONSTRAINTS)', v_schema);
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I.clientes                (LIKE public.clientes                INCLUDING DEFAULTS INCLUDING CONSTRAINTS)', v_schema);
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I.vendedores              (LIKE public.vendedores              INCLUDING DEFAULTS INCLUDING CONSTRAINTS)', v_schema);
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I.formas_pagamento        (LIKE public.formas_pagamento        INCLUDING DEFAULTS INCLUDING CONSTRAINTS)', v_schema);
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I.movimentacoes_estoque   (LIKE public.movimentacoes_estoque   INCLUDING DEFAULTS INCLUDING CONSTRAINTS)', v_schema);
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I.pedidos_venda           (LIKE public.pedidos_venda           INCLUDING DEFAULTS INCLUDING CONSTRAINTS)', v_schema);
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I.pedidos_venda_itens     (LIKE public.pedidos_venda_itens     INCLUDING DEFAULTS INCLUDING CONSTRAINTS)', v_schema);
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I.pedidos_venda_pagamentos(LIKE public.pedidos_venda_pagamentos INCLUDING DEFAULTS INCLUDING CONSTRAINTS)', v_schema);
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I.parametros_valores      (LIKE public.parametros_valores      INCLUDING DEFAULTS INCLUDING CONSTRAINTS)', v_schema);
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I.logs_auditoria          (LIKE public.logs_auditoria          INCLUDING DEFAULTS INCLUDING CONSTRAINTS)', v_schema);

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%s_logs_created_at ON %I.logs_auditoria (created_at DESC)',
    replace(v_schema, '-', '_'), v_schema
  );

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%s_logs_modulo ON %I.logs_auditoria (modulo)',
    replace(v_schema, '-', '_'), v_schema
  );

  -- Atualizar schema_name na tabela empresas
  UPDATE empresas SET schema_name = v_schema WHERE id_empresa = p_empresa_id;

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASSO 3: Criar schemas para todas as empresas existentes
-- =====================================================
DO $$
DECLARE
  emp RECORD;
BEGIN
  FOR emp IN SELECT id_empresa FROM empresas ORDER BY id_empresa LOOP
    RAISE NOTICE 'Criando schema para empresa %...', emp.id_empresa;
    PERFORM criar_schema_empresa(emp.id_empresa);
  END LOOP;
END;
$$;

-- =====================================================
-- PASSO 4: Migrar dados das tabelas compartilhadas
--          para os schemas por-empresa
-- =====================================================
DO $$
DECLARE
  emp RECORD;
  v_schema TEXT;
BEGIN
  FOR emp IN SELECT id_empresa, schema_name FROM empresas ORDER BY id_empresa LOOP
    v_schema := emp.schema_name;
    RAISE NOTICE 'Migrando dados para schema %...', v_schema;

    -- produtos
    EXECUTE format(
      'INSERT INTO %I.produtos SELECT * FROM public.produtos WHERE id_empresa = %s',
      v_schema, emp.id_empresa
    );

    -- clientes
    EXECUTE format(
      'INSERT INTO %I.clientes SELECT * FROM public.clientes WHERE id_empresa = %s',
      v_schema, emp.id_empresa
    );

    -- vendedores
    EXECUTE format(
      'INSERT INTO %I.vendedores SELECT * FROM public.vendedores WHERE id_empresa = %s',
      v_schema, emp.id_empresa
    );

    -- formas_pagamento
    EXECUTE format(
      'INSERT INTO %I.formas_pagamento SELECT * FROM public.formas_pagamento WHERE id_empresa = %s',
      v_schema, emp.id_empresa
    );

    -- movimentacoes_estoque
    EXECUTE format(
      'INSERT INTO %I.movimentacoes_estoque SELECT * FROM public.movimentacoes_estoque WHERE id_empresa = %s',
      v_schema, emp.id_empresa
    );

    -- pedidos_venda
    EXECUTE format(
      'INSERT INTO %I.pedidos_venda SELECT * FROM public.pedidos_venda WHERE id_empresa = %s',
      v_schema, emp.id_empresa
    );

    -- pedidos_venda_itens
    EXECUTE format(
      'INSERT INTO %I.pedidos_venda_itens SELECT * FROM public.pedidos_venda_itens WHERE id_empresa = %s',
      v_schema, emp.id_empresa
    );

    -- pedidos_venda_pagamentos
    EXECUTE format(
      'INSERT INTO %I.pedidos_venda_pagamentos SELECT * FROM public.pedidos_venda_pagamentos WHERE id_empresa = %s',
      v_schema, emp.id_empresa
    );

    -- parametros_valores
    EXECUTE format(
      'INSERT INTO %I.parametros_valores SELECT * FROM public.parametros_valores WHERE id_empresa = %s',
      v_schema, emp.id_empresa
    );

    -- logs_auditoria
    EXECUTE format(
      'INSERT INTO %I.logs_auditoria SELECT * FROM public.logs_auditoria WHERE id_empresa = %s',
      v_schema, emp.id_empresa
    );

    RAISE NOTICE 'Empresa % migrada com sucesso.', emp.id_empresa;
  END LOOP;
END;
$$;

-- =====================================================
-- PASSO 5: Limpar função auxiliar
-- =====================================================
DROP FUNCTION criar_schema_empresa(INTEGER);

-- =====================================================
-- VERIFICAÇÃO: Conferir se todos os schemas foram criados
-- =====================================================
SELECT
  id_empresa,
  razao_social,
  schema_name,
  CASE WHEN schema_name IS NOT NULL THEN '✓ OK' ELSE '✗ PENDENTE' END as status
FROM empresas
ORDER BY id_empresa;

COMMIT;

-- =====================================================
-- PASSO 6 (APÓS VALIDAR): Remover tabelas antigas do public
-- Execute SEPARADAMENTE após confirmar que a migração está OK:
--
-- DROP TABLE IF EXISTS public.logs_auditoria;
-- DROP TABLE IF EXISTS public.parametros_valores;
-- DROP TABLE IF EXISTS public.pedidos_venda_pagamentos;
-- DROP TABLE IF EXISTS public.pedidos_venda_itens;
-- DROP TABLE IF EXISTS public.pedidos_venda;
-- DROP TABLE IF EXISTS public.movimentacoes_estoque;
-- DROP TABLE IF EXISTS public.formas_pagamento;
-- DROP TABLE IF EXISTS public.vendedores;
-- DROP TABLE IF EXISTS public.clientes;
-- DROP TABLE IF EXISTS public.produtos;
-- =====================================================
