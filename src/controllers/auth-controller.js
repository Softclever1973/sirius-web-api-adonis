// =====================================================
// SIRIUS WEB API - Controller de Autenticação
// ATUALIZADO: Retorna parâmetros no login
// =====================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, querySchema, getClient } from '../config/database.js';
import { createEmpresaSchema } from '../config/schema-ddl.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

function handleAuthError(res, error) {
  if (error.code === '23505') {
    const mensagens = {
      'usuarios_email_key':  'Este e-mail já está cadastrado.',
      'empresas_cnpj_key':   'Este CNPJ já está cadastrado.',
      'empresas_email_key':  'Este e-mail de empresa já está em uso.',
    };
    const mensagem = mensagens[error.constraint] ?? 'Dado duplicado. Verifique as informações.';
    return res.status(409).json({ success: false, message: mensagem });
  }

  if (error.code === '23502') {
    return res.status(400).json({
      success: false,
      message: `O campo "${error.column}" é obrigatório.`
    });
  }

  if (error.code === '23503') {
    return res.status(400).json({ success: false, message: 'Referência inválida. Verifique os dados informados.' });
  }

  if (error.code === '08006' || error.code === '08001') {
    return res.status(503).json({ success: false, message: 'Serviço temporariamente indisponível. Tente novamente em instantes.' });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token inválido.' });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Sua sessão expirou. Faça login novamente.' });
  }

  return res.status(500).json({ success: false, message: 'Erro interno. Tente novamente.' });
}

/**
 * POST /auth/register
 * Registrar novo usuário
 */
export const register = async (req, res) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const {
      nome, sobrenome, email, senha, celular,
      razao_social, cnpj, telefone, email_empresa,
      cep, logradouro_tipo, logradouro, numero, complemento,
      bairro, municipio, uf
    } = req.body;

    // Validações básicas
    if (!nome || !email || !senha || !razao_social || !cnpj) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email, senha, razão social e CNPJ são obrigatórios'
      });
    }

    // Verificar se email já existe
    const emailExists = await client.query(
      'SELECT id_usuario FROM usuarios WHERE email = $1',
      [email.toLowerCase()]
    );

    if (emailExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Este email já está cadastrado'
      });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // =====================================================
    // Inserir usuário
    // =====================================================
    const userResult = await client.query(
      `INSERT INTO usuarios (nome, sobrenome, email, senha_hash, celular, status, is_super_admin)
       VALUES ($1, $2, $3, $4, $5, 'A', true)
       RETURNING id_usuario, nome, sobrenome, email, celular`,
      [nome, sobrenome || '', email.toLowerCase(), senhaHash, celular || null]
    );

    const usuario = userResult.rows[0];

    // =====================================================
    // Gerar id_empresa e schema_name antes do INSERT
    // =====================================================
    const nextEmpresaIdResult = await client.query(
      `SELECT nextval(pg_get_serial_sequence('empresas', 'id_empresa')) AS id_empresa`
    );

    const nextEmpresaId = nextEmpresaIdResult.rows[0].id_empresa;
    const schemaName = `emp_${nextEmpresaId}`;

    // =====================================================
    // Criar empresa já com schema_name
    // =====================================================
    const empresaResult = await client.query(
      `INSERT INTO empresas (
        id_empresa,
        razao_social,
        nome_fantasia,
        cnpj,
        telefone,
        email,
        plano,
        status,
        schema_name,
        cep,
        logradouro_tipo,
        logradouro,
        numero,
        complemento,
        bairro,
        municipio,
        uf
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'FREE', 'A', $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING id_empresa, razao_social, nome_fantasia, cnpj, plano, schema_name`,
      [
        nextEmpresaId,
        razao_social,
        razao_social,
        cnpj,
        telefone || null,
        email_empresa || null,
        schemaName,
        cep || null,
        logradouro_tipo || null,
        logradouro || null,
        numero || null,
        complemento || null,
        bairro || null,
        municipio || null,
        uf || null
      ]
    );

    const empresa = empresaResult.rows[0];

    // =====================================================
    // Vincular usuário à empresa como ADMIN
    // =====================================================
    await client.query(
      `INSERT INTO usuario_empresa (id_usuario, id_empresa, is_admin, ativo)
       VALUES ($1, $2, true, true)`,
      [usuario.id_usuario, empresa.id_empresa]
    );

    // =====================================================
    // Criar schema isolado da empresa
    // =====================================================
    await createEmpresaSchema(client, schemaName);

    // =====================================================
    // Inserir formas de pagamento padrão
    // =====================================================
    await client.query(`SET LOCAL search_path TO "${schemaName}", public`);

    await client.query(
      `INSERT INTO formas_pagamento (id_empresa, codigo, descricao, permite_troco, ativo)
       VALUES
        ($1,'04','Cartão de Débito',false,true),
        ($1,'01','Dinheiro',true,true),
        ($1,'03','Cartão de Crédito',false,true),
        ($1,'17','PIX',false,true)`,
      [empresa.id_empresa]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Cadastro realizado com sucesso! Faça login para continuar.',
      data: {
        usuario: {
          id: usuario.id_usuario,
          nome: usuario.nome,
          email: usuario.email
        },
        empresa: {
          id: empresa.id_empresa,
          razao_social: empresa.razao_social,
          nome_fantasia: empresa.nome_fantasia,
          schema_name: empresa.schema_name
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro no registro:', error);
    return handleAuthError(res, error);
  } finally {
    client.release();
  }
};

/**
 * POST /auth/login
 * Login do usuário
 * ✅ ATUALIZADO: Retorna parâmetros da empresa
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
      `SELECT id_usuario, nome, sobrenome, email, senha_hash, celular, status, is_super_admin
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
        e.schema_name,
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

    // Buscar TODOS os parâmetros da primeira empresa usando seu schema
    const primeiraEmpresa = empresas[0];
    const empresaId = primeiraEmpresa.id_empresa;
    const schemaEmpresa = primeiraEmpresa.schema_name;

    const parametrosQuery = `
      SELECT
        pd.codigo,
        COALESCE(pv.valor, pd.valor_padrao) as valor
      FROM public.parametros_definicoes pd
      LEFT JOIN parametros_valores pv
        ON pv.id_parametro = pd.id_parametro
        AND pv.id_empresa = $1
      WHERE pd.ativo = true
      ORDER BY pd.codigo
    `;

    // parametros_valores fica no schema da empresa; parametros_definicoes em public
    const parametrosResult = schemaEmpresa
      ? await querySchema(schemaEmpresa, parametrosQuery, [empresaId])
      : await query(parametrosQuery, [empresaId]);
    
    // Transformar array em objeto { codigo: valor }
    const parametros = {};
    parametrosResult.rows.forEach(row => {
      parametros[row.codigo] = row.valor;
    });
    
    console.log(`✅ Login: ${usuario.email} - ${parametrosResult.rows.length} parâmetros carregados`);
    
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
    
    // Retornar sucesso COM PARÂMETROS
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
          celular: usuario.celular,
          is_super_admin: usuario.is_super_admin
        },
        empresas: empresas.map(emp => ({
          id: emp.id_empresa,
          razao_social: emp.razao_social,
          nome_fantasia: emp.nome_fantasia,
          cnpj: emp.cnpj,
          plano: emp.plano,
          is_admin: emp.is_admin,
          schema: emp.schema_name
        })),
        parametros: parametros  // ✅ NOVO! Todos os parâmetros da empresa
      }
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    return handleAuthError(res, error);
  }
};

/**
 * PUT /auth/change-password
 * Altera a senha do usuário logado
 */
export const changePassword = async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;
    const userId = req.user.id;

    if (!senha_atual || !nova_senha) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias.'
      });
    }

    if (nova_senha.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A nova senha deve ter pelo menos 6 caracteres.'
      });
    }

    const result = await query(
      'SELECT senha_hash FROM usuarios WHERE id_usuario = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const senhaCorreta = await bcrypt.compare(senha_atual, result.rows[0].senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
    }

    const novaSenhaHash = await bcrypt.hash(nova_senha, 10);

    await query(
      'UPDATE usuarios SET senha_hash = $1 WHERE id_usuario = $2',
      [novaSenhaHash, userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Senha alterada com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return handleAuthError(res, error);
  }
};

/**
 * POST /auth/forgot-password
 * Solicita redefinição de senha — envia email com token
 */
export const forgotPassword = async (req, res) => {
  const { email, baseUrl: baseUrlBody } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'E-mail é obrigatório.' });
  }

  try {
    const result = await query(
      "SELECT id_usuario, nome FROM usuarios WHERE email = $1 AND status = 'A'",
      [email.toLowerCase()]
    );

    // Responde igual independente de o email existir (evita enumeração)
    const mensagemPadrao = 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.';

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, message: mensagemPadrao });
    }

    const usuario = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await query(
      'UPDATE usuarios SET reset_token = $1, reset_token_expiry = $2 WHERE id_usuario = $3',
      [token, expiry, usuario.id_usuario]
    );

    const baseUrl = (baseUrlBody || req.headers.origin || process.env.FRONTEND_URL || '').replace(/\/$/, '');

    await sendPasswordResetEmail(email.toLowerCase(), usuario.nome, token, baseUrl);

    console.log(`✅ Reset de senha solicitado: ${email}`);
    return res.status(200).json({ success: true, message: mensagemPadrao });

  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    return res.status(500).json({ success: false, message: 'Erro ao processar solicitação. Tente novamente.' });
  }
};

/**
 * POST /auth/reset-password
 * Valida token e salva nova senha
 */
export const resetPassword = async (req, res) => {
  const { token, nova_senha } = req.body;

  if (!token || !nova_senha) {
    return res.status(400).json({ success: false, message: 'Token e nova senha são obrigatórios.' });
  }

  if (nova_senha.length < 6) {
    return res.status(400).json({ success: false, message: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const result = await query(
      "SELECT id_usuario FROM usuarios WHERE reset_token = $1 AND reset_token_expiry > NOW()",
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Link inválido ou expirado. Solicite uma nova redefinição de senha.'
      });
    }

    const novaSenhaHash = await bcrypt.hash(nova_senha, 10);

    await query(
      'UPDATE usuarios SET senha_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id_usuario = $2',
      [novaSenhaHash, result.rows[0].id_usuario]
    );

    console.log(`✅ Senha redefinida para usuário ${result.rows[0].id_usuario}`);
    return res.status(200).json({ success: true, message: 'Senha redefinida com sucesso! Você já pode fazer login.' });

  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return res.status(500).json({ success: false, message: 'Erro ao redefinir senha. Tente novamente.' });
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
    return handleAuthError(res, error);
  }
};
