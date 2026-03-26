// =====================================================
// Controller de Vendedores
// =====================================================

import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { registrarLog } from '../services/audit-service.js';

/**
 * GET /vendedores
 * Listar todos os vendedores da empresa
 */
export const getClientes = async (req, res) => {
  res.json({
    success: true,
    message: 'Vendedores carregado com sucesso.',
    data:{
      empresa: req.empresa
    }
  });
};

export const listarVendedores = async (req, res) => {
  try {
    // Buscar id_empresa de múltiplas fontes possíveis
    const idEmpresa = req.empresaId || req.empresa?.id || req.user?.id_empresa;
    
    // Debug
    console.log('🔍 [listarVendedores] ID Empresa:', idEmpresa);
    
    if (!idEmpresa) {
      console.error('❌ ID da empresa não encontrado!');
      return res.status(400).json({
        success: false,
        message: 'Erro ao identificar empresa'
      });
    }
    
    const result = await query(
      `SELECT
        v.id_vendedor,
        v.id_empresa,
        v.nome,
        v.cpf,
        v.fone,
        v.email,
        v.endereco,
        v.complemento,
        v.cidade,
        v.uf,
        v.cep,
        v.comissao,
        v.meta_vendas,
        v.status,
        v.observacoes,
        v.created_at,
        v.updated_at,
        ue.is_admin
       FROM vendedores v
       LEFT JOIN usuario_empresa ue ON ue.id_usuario = v.id_user AND ue.id_empresa = v.id_empresa
       WHERE v.id_empresa = $1
       ORDER BY v.nome`,
      [idEmpresa]
    );
    
    return res.status(200).json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Erro ao listar vendedores:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar vendedores'
    });
  }
};

/**
 * GET /vendedores/:id
 * Buscar vendedor por ID
 */
export const buscarVendedor = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar id_empresa de múltiplas fontes possíveis
    const idEmpresa = req.empresaId || req.empresa?.id || req.user?.id_empresa;
    
    // Debug
    console.log('🔍 [buscarVendedor] ID Empresa:', idEmpresa);
    
    if (!idEmpresa) {
      console.error('❌ ID da empresa não encontrado!');
      return res.status(400).json({
        success: false,
        message: 'Erro ao identificar empresa'
      });
    }
    
    const result = await query(
      `SELECT 
        id_vendedor,
        id_empresa,
        nome,
        cpf,
        fone,
        email,
        endereco,
        complemento,
        cidade,
        uf,
        cep,
        comissao,
        meta_vendas,
        status,
        observacoes,
        created_at,
        updated_at
       FROM vendedores 
       WHERE id_vendedor = $1 AND id_empresa = $2`,
      [id, idEmpresa]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor não encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao buscar vendedor:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar vendedor'
    });
  }
};

/**
 * POST /vendedores
 * Criar novo vendedor
 */
export const criarVendedor = async (req, res) => {
  try {
    // Buscar id_empresa de múltiplas fontes possíveis
    const idEmpresa = req.empresaId || req.empresa?.id || req.user?.id_empresa;
    
    // Debug detalhado
    console.log('🔍 [criarVendedor] Debug completo:');
    console.log('   req.empresaId:', req.empresaId);
    console.log('   req.empresa:', req.empresa);
    console.log('   req.user:', req.user);
    console.log('   ID Empresa final:', idEmpresa);
    
    // Validação crítica
    if (!idEmpresa) {
      console.error('❌ ID da empresa não encontrado!');
      return res.status(400).json({
        success: false,
        message: 'Erro ao identificar empresa. Verifique a autenticação.'
      });
    }
    
    const {
      nome,
      cpf,
      fone,
      email,
      endereco,
      complemento,
      cidade,
      uf,
      cep,
      comissao,
      meta_vendas,
      observacoes,
      status,
      senha,
      isAdmin
    } = req.body;
    
    // Validações básicas
    if (!nome) {
      return res.status(400).json({
        success: false,
        message: 'Nome é obrigatório'
      });
    }
    
    if (!fone) {
      return res.status(400).json({
        success: false,
        message: 'Telefone é obrigatório'
      });
    }
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-mail é obrigatório'
      });
    }
    if (!senha){
      return res.status(400).json({
        success: false,
        message: 'Senha é obrigatoria'
      })
    }
      const senhaHash = await bcrypt.hash(senha, 10);
    console.log('✅ Validações OK. Criando usuário e vendedor com id_empresa:', idEmpresa);

    // Criar usuário primeiro para obter o id_usuario
    const userResult = await query(
      `INSERT INTO usuarios (nome, sobrenome, email, senha_hash, celular, status, is_super_admin)
       VALUES ($1, $2, $3, $4, $5, 'A', false)
       RETURNING id_usuario, nome, email, celular`,
      [nome || '', '', email.toLowerCase(), senhaHash, fone || null]
    );
    const usuario = userResult.rows[0];

    await query(
      `INSERT INTO usuario_empresa (id_usuario, id_empresa, is_admin, ativo)
       VALUES ($1, $2, $3, true)`,
      [usuario.id_usuario, idEmpresa, isAdmin]
    );

    // Inserir vendedor com o id_usuario já vinculado
    const result = await query(
      `INSERT INTO vendedores (
        id_empresa,
        id_user,
        nome,
        cpf,
        fone,
        email,
        endereco,
        complemento,
        cidade,
        uf,
        cep,
        comissao,
        meta_vendas,
        observacoes,
        status,
        senha_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        idEmpresa,
        usuario.id_usuario,
        nome,
        cpf,
        fone,
        email,
        endereco,
        complemento,
        cidade,
        uf,
        cep,
        comissao,
        meta_vendas,
        observacoes,
        status || 'A',
        senhaHash
      ]
    );

    console.log('✅ Vendedor criado com sucesso! ID:', result.rows[0].id_vendedor);

    registrarLog({
      req,
      acao: 'CRIOU',
      modulo: 'Vendedores',
      id_registro: result.rows[0].id_vendedor,
      descricao: `Criou o vendedor "${result.rows[0].nome}"`,
      dados_novos: { id_vendedor: result.rows[0].id_vendedor, nome: result.rows[0].nome, email: result.rows[0].email }
    });

    return res.status(201).json({
      success: true,
      message: 'Vendedor criado com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar vendedor:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao criar vendedor'
    });
  }
};

/**
 * PUT /vendedores/:id
 * Atualizar vendedor existente
 */
export const atualizarVendedor = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar id_empresa de múltiplas fontes possíveis
    const idEmpresa = req.empresaId || req.empresa?.id || req.user?.id_empresa;
    
    // Debug
    console.log('🔍 [atualizarVendedor] ID Empresa:', idEmpresa);
    
    if (!idEmpresa) {
      console.error('❌ ID da empresa não encontrado!');
      return res.status(400).json({
        success: false,
        message: 'Erro ao identificar empresa'
      });
    }
    
    const {
      nome,
      cpf,
      fone,
      email,
      endereco,
      complemento,
      cidade,
      uf,
      cep,
      comissao,
      meta_vendas,
      observacoes,
      status,
      isAdmin
    } = req.body;
    
    // Validações básicas
    if (!nome) {
      return res.status(400).json({
        success: false,
        message: 'Nome é obrigatório'
      });
    }

    // Buscar dados anteriores para o log
    const vendedorAtual = await query(
      'SELECT id_vendedor, nome, email, fone, status FROM vendedores WHERE id_vendedor = $1 AND id_empresa = $2',
      [id, idEmpresa]
    );
    const dadosAnterioresVendedor = vendedorAtual.rows[0] || null;

    // Atualizar vendedor
    const result = await query(
      `UPDATE vendedores SET
        nome = $1,
        cpf = $2,
        fone = $3,
        email = $4,
        endereco = $5,
        complemento = $6,
        cidade = $7,
        uf = $8,
        cep = $9,
        comissao = $10,
        meta_vendas = $11,
        observacoes = $12,
        status = $13,
        updated_at = NOW()
       WHERE id_vendedor = $14 AND id_empresa = $15
       RETURNING *`,
      [
        nome,
        cpf,
        fone,
        email,
        endereco,
        complemento,
        cidade,
        uf,
        cep,
        comissao,
        meta_vendas,
        observacoes,
        status,
        id,
        idEmpresa
      ]
    );
    const result2 = await query(`UPDATE usuario_empresa SET is_admin = $1, ativo = $2 WHERE id_usuario = $3`, [isAdmin, status === 'A' ? true : false, result.rows[0].id_user])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendedor não encontrado'
      });
    }

    registrarLog({
      req,
      acao: 'ALTEROU',
      modulo: 'Vendedores',
      id_registro: id,
      descricao: `Alterou o vendedor "${result.rows[0].nome}"`,
      dados_anteriores: dadosAnterioresVendedor,
      dados_novos: { id_vendedor: result.rows[0].id_vendedor, nome: result.rows[0].nome, email: result.rows[0].email }
    });

    return res.status(200).json({
      success: true,
      message: 'Vendedor atualizado com sucesso',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erro ao atualizar vendedor:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar vendedor'
    });
  }
};

/**
 * DELETE /vendedores/:id
 * Excluir vendedor
 */
export const excluirVendedor = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar id_empresa de múltiplas fontes possíveis
    const idEmpresa = req.empresaId || req.empresa?.id || req.user?.id_empresa;
    
    // Debug
    console.log('🔍 [excluirVendedor] ID Empresa:', idEmpresa);
    
    if (!idEmpresa) {
      console.error('❌ ID da empresa não encontrado!');
      return res.status(400).json({
        success: false,
        message: 'Erro ao identificar empresa'
      });
    }
    
    const vendedor = await query(
      `SELECT v.id_vendedor, v.nome, v.email, v.fone, v.status, v.id_user, ue.is_admin
       FROM vendedores v
       LEFT JOIN usuario_empresa ue ON ue.id_usuario = v.id_user AND ue.id_empresa = $2
       WHERE v.id_vendedor = $1 AND v.id_empresa = $2`,
      [id, idEmpresa]
    );
    if (vendedor.rows.length === 0){
      return res.status(404).json({
        success: false,
        message: 'Vendedor não encontrado'
      });
    }

    const vendorIsAdmin = vendedor.rows[0].is_admin;
    if (vendorIsAdmin && !req.isSuperAdmin){
      return res.status(403).json({
        success: false,
        message: 'Apenas Super Admins podem excluir vendedores com permissão de admin.'
      })
    }

    const idUser = vendedor.rows[0].id_user;
    
    const result = await query(
      `DELETE FROM vendedores 
       WHERE id_vendedor = $1 AND id_empresa = $2
       RETURNING id_vendedor`,
      [id, idEmpresa]
    );
    
    if (idUser){
      await query(`DELETE FROM usuarios WHERE id_usuario = $1`, [idUser]);
    }

    registrarLog({
      req,
      acao: 'EXCLUIU',
      modulo: 'Vendedores',
      id_registro: id,
      descricao: `Excluiu o vendedor "${vendedor.rows[0].nome}"`,
      dados_anteriores: { id_vendedor: vendedor.rows[0].id_vendedor, nome: vendedor.rows[0].nome, email: vendedor.rows[0].email, status: vendedor.rows[0].status }
    });

    return res.status(200).json({
      success: true,
      message: 'Vendedor excluído com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao excluir vendedor:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao excluir vendedor'
    });
  }
};
