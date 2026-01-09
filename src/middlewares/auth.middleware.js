// =====================================================
// Middleware de Autenticação JWT
// =====================================================

import jwt from 'jsonwebtoken';

/**
 * Middleware para verificar token JWT
 * Adiciona req.user com os dados do token decodificado
 */
export const authenticateToken = (req, res, next) => {
  // Pegar token do header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token não fornecido. Acesso negado.'
    });
  }
  
  try {
    // Verificar e decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Adicionar dados do usuário no request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      nome: decoded.nome
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Faça login novamente.'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Token inválido.'
    });
  }
};

/**
 * Middleware opcional - não retorna erro se não tiver token
 * Útil para rotas que podem funcionar com ou sem autenticação
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        nome: decoded.nome
      };
    } catch (error) {
      // Token inválido ou expirado, mas não bloqueia a request
      req.user = null;
    }
  }
  
  next();
};
