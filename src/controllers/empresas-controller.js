// =====================================================
// Controller de Empresas
// =====================================================

import { query, getClient } from '../config/database.js';

/**
 * GET /empresas
 * Lista todas as empresas do usuário logado
 */
export const listarEmpresas = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        e.id_empresa,
        e.razao_social,
        e.nome_fantasia,
        e.cnpj,
        e.email,
        e.telefone,
        e.plano,
        e.status,
        e.limite_nfce_mes,
        e.limite_valor_mes,
        e.nfce_emitidas_mes_atual,
        e.valor_emitido_mes_atual,
        e.created_at,
        ue.is_admin
       FROM usuario_empresa ue
       JOIN empresas e ON e.id_empresa = ue.id_empresa
       WHERE ue.id_usuario = $1 AND ue.ativo = true
       ORDER BY e.razao_social`,
      [req.user.id]
    );
    
    return res.status(200).json({
      success: true,
      data: result.rows.map(empresa => ({
        id: empresa.id_empresa,
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia,
        cnpj: empresa.cnpj,
        email: empresa.email,
        telefone: empresa.telefone,
        plano: empresa.plano,
        status: empresa.status,
        is_admin: empresa.is_admin,
        limites: {
          nfce_mes: empresa.limite_nfce_mes,
          valor_mes: parseFloat(empresa.limite_valor_mes),
          nfce_utilizadas: empresa.nfce_emitidas_mes_atual,
          valor_utilizado: parseFloat(empresa.valor_emitido_mes_atual)
        },
        membro_desde: empresa.created_at
      }))
    });
    
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar empresas'
    });
  }
};

/**
 * GET /empresas/:id
 * Busca dados de uma empresa específica
 */
export const buscarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se usuário tem acesso à empresa
    const result = await query(
      `SELECT 
        e.*,
        rt.nome as regime_tributario_nome,
        ue.is_admin
       FROM usuario_empresa ue
       JOIN empresas e ON e.id_empresa = ue.id_empresa
       LEFT JOIN regimes_tributarios rt ON rt.id_rt = e.id_regime_tributario
       WHERE ue.id_usuario = $1 AND e.id_empresa = $2 AND ue.ativo = true`,
      [req.user.id, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada ou você não tem acesso'
      });
    }
    
    const empresa = result.rows[0];
    
    return res.status(200).json({
      success: true,
      data: {
        id: empresa.id_empresa,
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia,
        cnpj: empresa.cnpj,
        
        endereco: {
          logradouro_tipo: empresa.logradouro_tipo,
          logradouro: empresa.logradouro,
          numero: empresa.numero,
          complemento: empresa.complemento,
          bairro: empresa.bairro,
          municipio: empresa.municipio,
          uf: empresa.uf,
          cep: empresa.cep,
          codigo_municipal: empresa.codigo_municipal
        },
        
        contato: {
          telefone: empresa.telefone,
          email: empresa.email
        },
        
        fiscal: {
          inscricao_estadual: empresa.inscricao_estadual,
          regime_tributario: empresa.regime_tributario_nome
        },
        
        nfce: {
          serie_padrao: empresa.nfce_serie_padrao,
          usa_ambiente_teste: empresa.usa_ambiente_teste,
          tem_certificado: empresa.certificado !== null
        },
        
        plano: empresa.plano,
        status: empresa.status,
        is_admin: empresa.is_admin,
        
        limites: {
          nfce_mes: empresa.limite_nfce_mes,
          valor_mes: parseFloat(empresa.limite_valor_mes),
          nfce_utilizadas: empresa.nfce_emitidas_mes_atual,
          valor_utilizado: parseFloat(empresa.valor_emitido_mes_atual)
        },
        
        created_at: empresa.created_at,
        updated_at: empresa.updated_at
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar empresa'
    });
  }
};

/**
 * PUT /empresas/:id
 * Atualiza dados da empresa
 * Apenas administradores podem atualizar
 */
export const atualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se usuário é admin da empresa
    const acessoResult = await query(
      `SELECT ue.is_admin
       FROM usuario_empresa ue
       WHERE ue.id_usuario = $1 AND ue.id_empresa = $2 AND ue.ativo = true`,
      [req.user.id, id]
    );
    
    if (acessoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada ou você não tem acesso'
      });
    }
    
    if (!acessoResult.rows[0].is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Apenas administradores podem atualizar dados da empresa'
      });
    }
    
    const {
      razao_social,
      nome_fantasia,
      logradouro_tipo,
      logradouro,
      numero,
      complemento,
      bairro,
      municipio,
      uf,
      cep,
      telefone,
      email,
      inscricao_estadual
    } = req.body;
    
    // Atualizar empresa
    const result = await query(
      `UPDATE empresas SET
        razao_social = COALESCE($1, razao_social),
        nome_fantasia = COALESCE($2, nome_fantasia),
        logradouro_tipo = COALESCE($3, logradouro_tipo),
        logradouro = COALESCE($4, logradouro),
        numero = COALESCE($5, numero),
        complemento = $6,
        bairro = COALESCE($7, bairro),
        municipio = $8,
        uf = COALESCE($9, uf),
        cep = COALESCE($10, cep),
        telefone = COALESCE($11, telefone),
        email = COALESCE($12, email),
        inscricao_estadual = $13,
        updated_at = NOW()
       WHERE id_empresa = $14
       RETURNING *`,
      [
        razao_social, nome_fantasia, logradouro_tipo, logradouro, numero,
        complemento, bairro, municipio, uf, cep, telefone, email,
        inscricao_estadual, id
      ]
    );
    
    return res.status(200).json({
      success: true,
      message: 'Empresa atualizada com sucesso',
      data: {
        id: result.rows[0].id_empresa,
        razao_social: result.rows[0].razao_social,
        nome_fantasia: result.rows[0].nome_fantasia,
        updated_at: result.rows[0].updated_at
      }
    });
    
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar empresa'
    });
  }
};
