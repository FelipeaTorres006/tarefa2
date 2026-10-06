const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');

function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const [tipo, token] = typeof authHeader === 'string' ? authHeader.split(' ') : [];

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: "Token de autenticação não fornecido ou formato inválido." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = {
      id: payload.sub,
      nome: payload.nome,
      email: payload.email,
      role: payload.role
    };
    return next();
  } catch (error) {
    const mensagem = error.name === 'TokenExpiredError'
      ? 'Token de autenticação expirado.'
      : 'Token de autenticação inválido.';

    return res.status(401).json({ erro: mensagem });
  }
}

function exigirRole(...rolesEsperadas) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: "Autenticação necessária." });
    }

    if (!rolesEsperadas.includes(req.usuario.role)) {
      return res.status(403).json({
        erro: `Acesso proibido: privilégio de ${rolesEsperadas.join(' ou ')} exigido.`
      });
    }

    return next();
  };
}

module.exports = { autenticarToken, exigirRole };
