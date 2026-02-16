// =====================================================
// SIRIUS WEB API - Controller de Autenticação
// ATUALIZADO: Retorna parâmetros no login
// =====================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, getClient } from '../config/database.js';

/**
 * POST /auth/register
 * Registrar novo usuário
 */
export const register = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { nome, sobrenome, email, senha, celular, razao_social, cnpj } = req.body;
    
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
    
    // Inserir usuário
    const userResult = await client.query(
      `INSERT INTO usuarios (nome, sobrenome, email, senha_hash, celular, status)
       VALUES ($1, $2, $3, $4, $5, 'A')
       RETURNING id_usuario, nome, sobrenome, email, celular`,
      [nome, sobrenome || '', email.toLowerCase(), senhaHash, celular || null]
    );
    
    const usuario = userResult.rows[0];
    
    // Criar empresa
    const empresaResult = await client.query(
      `INSERT INTO empresas (razao_social, nome_fantasia, cnpj, plano, status)
       VALUES ($1, $2, $3, 'FREE', 'A')
       RETURNING id_empresa, razao_social, nome_fantasia, cnpj, plano`,
      [razao_social, razao_social, cnpj]
    );
    
    const empresa = empresaResult.rows[0];
    
    // Vincular usuário à empresa como ADMIN
    await client.query(
      `INSERT INTO usuario_empresa (id_usuario, id_empresa, is_admin, ativo)
       VALUES ($1, $2, true, true)`,
      [usuario.id_usuario, empresa.id_empresa]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
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
          razao_social: empresa.razao_social
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
    
    // ✅ NOVO: Buscar TODOS os parâmetros da primeira empresa
    const empresaId = empresas[0].id_empresa;
    
    const parametrosQuery = `
      SELECT 
        pd.codigo,
        COALESCE(pv.valor, pd.valor_padrao) as valor
      FROM parametros_definicoes pd
      LEFT JOIN parametros_valores pv 
        ON pv.id_parametro = pd.id_parametro 
        AND pv.id_empresa = $1
      WHERE pd.ativo = true
      ORDER BY pd.codigo
    `;
    
    const parametrosResult = await query(parametrosQuery, [empresaId]);
    
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
          celular: usuario.celular
        },
        empresas: empresas.map(emp => ({
          id: emp.id_empresa,
          razao_social: emp.razao_social,
          nome_fantasia: emp.nome_fantasia,
          cnpj: emp.cnpj,
          plano: emp.plano,
          is_admin: emp.is_admin
        })),
        parametros: parametros  // ✅ NOVO! Todos os parâmetros da empresa
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
