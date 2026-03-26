-- =====================================================
-- SIRIUS WEB — Migração: Tabela de Log de Auditoria
-- Execute este script no banco de dados via Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS logs_auditoria (
  id_log            BIGSERIAL    PRIMARY KEY,
  id_empresa        INTEGER      NOT NULL,
  id_usuario        INTEGER,
  nome_usuario      VARCHAR(200),
  acao              VARCHAR(20)  NOT NULL,  -- 'CRIOU', 'ALTEROU', 'EXCLUIU'
  modulo            VARCHAR(50)  NOT NULL,  -- 'Produtos', 'Clientes', 'Vendedores', etc.
  id_registro       VARCHAR(100),           -- ID do registro afetado
  descricao         TEXT,                   -- Texto legível da ação
  dados_anteriores  JSONB,                  -- Estado antes (UPDATE/DELETE)
  dados_novos       JSONB,                  -- Estado depois (INSERT/UPDATE)
  ip_address        VARCHAR(45),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_logs_empresa       ON logs_auditoria (id_empresa);
CREATE INDEX IF NOT EXISTS idx_logs_created_at    ON logs_auditoria (id_empresa, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_modulo        ON logs_auditoria (id_empresa, modulo);
CREATE INDEX IF NOT EXISTS idx_logs_usuario       ON logs_auditoria (id_usuario);
