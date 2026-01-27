// =====================================================
// Controller de Autenticação
// =====================================================

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, getClient, setEmpresaId } from '../config/database.js';

/**
 * POST /auth/register
 * Cadastrar nova empresa + primeiro usuário (administrador)
 */
export const register = async (req, res) => {
  const client = await getClient();
  
  try {
    const {
      // Dados do usuário
      nome,
      sobrenome,
      email,
      senha,
      celular,
      
      // Dados da empresa
      razao_social,
      nome_fantasia,
      cnpj,
      logradouro_tipo,
      logradouro,
      numero,
      complemento,
      bairro,
      municipio,
      uf,
      cep,
      telefone,
      email_empresa
    } = req.body;
    
    // Validações básicas
    if (!nome || !sobrenome || !email || !senha || !celular) {
      return res.status(400).json({
        success: false,
        message: 'Dados do usuário incompletos (nome, sobrenome, email, senha, celular)'
      });
    }
    
    if (!razao_social || !nome_fantasia || !cnpj || !logradouro || !numero || !bairro || !uf || !cep || !telefone || !email_empresa) {
      return res.status(400).json({
        success: false,
        message: 'Dados da empresa incompletos'
      });
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email do usuário inválido'
      });
    }
    
    // Validar CNPJ (apenas dígitos)
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      return res.status(400).json({
        success: false,
        message: 'CNPJ inválido (deve conter 14 dígitos)'
      });
    }
    
    // Iniciar transação
    await client.query('BEGIN');
    
    // Verificar se email já existe
    const usuarioExiste = await client.query(
      'SELECT id_usuario FROM usuarios WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (usuarioExiste.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Este email já está cadastrado'
      });
    }
    
    // Verificar se CNPJ já existe
    const empresaExiste = await client.query(
      'SELECT id_empresa FROM empresas WHERE cnpj = $1',
      [cnpjLimpo]
    );
    
    if (empresaExiste.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Este CNPJ já está cadastrado'
      });
    }
    
    // Hash da senha (bcrypt)
    const senhaHash = await bcrypt.hash(senha, 10);
    
    // 1. Criar usuário
    const novoUsuario = await client.query(
      `INSERT INTO usuarios (nome, sobrenome, email, senha_hash, celular, status, email_verificado)
       VALUES ($1, $2, $3, $4, $5, 'A', false)
       RETURNING id_usuario, nome, sobrenome, email, celular`,
      [nome, sobrenome, email.toLowerCase(), senhaHash, celular]
    );
    
    const usuario = novoUsuario.rows[0];
    
    // 2. Criar empresa (plano FREE por padrão)
    const novaEmpresa = await client.query(
      `INSERT INTO empresas (
        razao_social, nome_fantasia, cnpj,
        logradouro_tipo, logradouro, numero, complemento, bairro,
        municipio, uf, cep, telefone, email,
        status, plano, limite_nfce_mes, limite_valor_mes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'A', 'FREE', 200, 50000.00)
      RETURNING id_empresa, razao_social, nome_fantasia, cnpj, plano`,
      [
        razao_social, nome_fantasia, cnpjLimpo,
        logradouro_tipo, logradouro, numero, complemento, bairro,
        municipio, uf, cep, telefone, email_empresa
      ]
    );
    
    const empresa = novaEmpresa.rows[0];
    
    // 3. Vincular usuário à empresa (como admin)
    await client.query(
      `INSERT INTO usuario_empresa (id_usuario, id_empresa, is_admin, ativo)
       VALUES ($1, $2, true, true)`,
      [usuario.id_usuario, empresa.id_empresa]
    );
    
    // 4. Criar formas de pagamento padrão (códigos SEFAZ)
    const formasPagamento = [
      ['01', 'Dinheiro', true],
      ['03', 'Cartão de Crédito', false],
      ['04', 'Cartão de Débito', false],
      ['17', 'PIX', false]
    ];
    
    for (const [codigo, descricao, permite_troco] of formasPagamento) {
      await client.query(
        `INSERT INTO formas_pagamento (id_empresa, codigo, descricao, permite_troco, ativo)
         VALUES ($1, $2, $3, $4, true)`,
        [empresa.id_empresa, codigo, descricao, permite_troco]
      );
    }
    
    // 5. Criar sequence para vendedores (se não existir)
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS vendedores_id_vendedor_seq;
    `);
    
    // 6. Criar tabela vendedores (se não existir)
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendedores (
        id_vendedor integer NOT NULL DEFAULT nextval('vendedores_id_vendedor_seq'::regclass),
        id_empresa integer NOT NULL,
        nome text NOT NULL,
        cpf character varying,
        fone character varying,
        email text,
        endereco text,
        complemento text,
        cidade text,
        uf character varying(2),
        cep character varying,
        comissao numeric,
        meta_vendas numeric,
        status character DEFAULT 'A'::bpchar CHECK (status = ANY (ARRAY['A'::bpchar, 'I'::bpchar])),
        observacoes text,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(),
        CONSTRAINT vendedores_pkey PRIMARY KEY (id_vendedor),
        CONSTRAINT vendedores_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
      );
    `);
    
    // 7. Criar índices para vendedores (se não existirem)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendedores_id_empresa ON vendedores(id_empresa);
      CREATE INDEX IF NOT EXISTS idx_vendedores_status ON vendedores(status);
      CREATE INDEX IF NOT EXISTS idx_vendedores_nome ON vendedores(nome);
    `);
    
    // Commit da transação
    await client.query('COMMIT');
    
    // Gerar token JWT
    const token = jwt.sign(
      {
        id: usuario.id_usuario,
        email: usuario.email,
        nome: `${usuario.nome} ${usuario.sobrenome}`
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // Retornar sucesso
    return res.status(201).json({
      success: true,
      message: 'Cadastro realizado com sucesso!',
      data: {
        token,
        usuario: {
          id: usuario.id_usuario,
          nome: usuario.nome,
          sobrenome: usuario.sobrenome,
          email: usuario.email
        },
        empresa: {
          id: empresa.id_empresa,
          razao_social: empresa.razao_social,
          nome_fantasia: empresa.nome_fantasia,
          cnpj: empresa.cnpj,
          plano: empresa.plano
        }
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro no registro:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao realizar cadastro. Tente novamente.'
    });
  } finally {
    client.release();
  }
};

/**
 * POST /auth/login
 * Login do usuário
 */
export const login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }
    
    // Buscar usuário por email
    const result = await query(
      `SELECT id_usuario, nome, sobrenome, email, senha_hash, celular, status
       FROM usuarios
       WHERE email = $1`,
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }
    
    const usuario = result.rows[0];
    
    // Verificar se usuário está ativo
    if (usuario.status !== 'A') {
      return res.status(401).json({
        success: false,
        message: 'Usuário inativo. Entre em contato com o suporte.'
      });
    }
    
    // Verificar senha
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    
    if (!senhaCorreta) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }
    
    // Buscar empresas do usuário
    const empresasResult = await query(
      `SELECT 
        e.id_empresa,
        e.razao_social,
        e.nome_fantasia,
        e.cnpj,
        e.plano,
        ue.is_admin
       FROM usuario_empresa ue
       JOIN empresas e ON e.id_empresa = ue.id_empresa
       WHERE ue.id_usuario = $1 AND ue.ativo = true AND e.status = 'A'
       ORDER BY e.razao_social`,
      [usuario.id_usuario]
    );
    
    const empresas = empresasResult.rows;
    
    if (empresas.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Usuário não está vinculado a nenhuma empresa ativa'
      });
    }
    
    // Atualizar último login
    await query(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id_usuario = $1',
      [usuario.id_usuario]
    );
    
    // Gerar token JWT
    const token = jwt.sign(
      {
        id: usuario.id_usuario,
        email: usuario.email,
        nome: `${usuario.nome} ${usuario.sobrenome}`
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // Retornar sucesso
    return res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso!',
      data: {
        token,
        usuario: {
          id: usuario.id_usuario,
          nome: usuario.nome,
          sobrenome: usuario.sobrenome,
          email: usuario.email,
          celular: usuario.celular
        },
        empresas: empresas.map(emp => ({
          id: emp.id_empresa,
          razao_social: emp.razao_social,
          nome_fantasia: emp.nome_fantasia,
          cnpj: emp.cnpj,
          plano: emp.plano,
          is_admin: emp.is_admin
        }))
      }
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao realizar login. Tente novamente.'
    });
  }
};

/**
 * GET /auth/me
 * Retorna dados do usuário logado
 */
export const me = async (req, res) => {
  try {
    // req.user vem do middleware authenticateToken
    const result = await query(
      `SELECT id_usuario, nome, sobrenome, email, celular, status, email_verificado, created_at
       FROM usuarios
       WHERE id_usuario = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    const usuario = result.rows[0];
    
    // Buscar empresas do usuário
    const empresasResult = await query(
      `SELECT 
        e.id_empresa,
        e.razao_social,
        e.nome_fantasia,
        e.cnpj,
        e.plano,
        ue.is_admin
       FROM usuario_empresa ue
       JOIN empresas e ON e.id_empresa = ue.id_empresa
       WHERE ue.id_usuario = $1 AND ue.ativo = true AND e.status = 'A'
       ORDER BY e.razao_social`,
      [usuario.id_usuario]
    );
    
    return res.status(200).json({
      success: true,
      data: {
        usuario: {
          id: usuario.id_usuario,
          nome: usuario.nome,
          sobrenome: usuario.sobrenome,
          email: usuario.email,
          celular: usuario.celular,
          status: usuario.status,
          email_verificado: usuario.email_verificado,
          membro_desde: usuario.created_at
        },
        empresas: empresasResult.rows.map(emp => ({
          id: emp.id_empresa,
          razao_social: emp.razao_social,
          nome_fantasia: emp.nome_fantasia,
          cnpj: emp.cnpj,
          plano: emp.plano,
          is_admin: emp.is_admin
        }))
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados do usuário'
    });
  }
};
