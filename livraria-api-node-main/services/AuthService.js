const repository = require('../repositories/LivrariaRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_SALT_ROUNDS } = require('../config/auth');

class AuthService {
  async registrar({ nome, email, senha }) {
    const nomeNormalizado = typeof nome === 'string' ? nome.trim() : '';
    const emailNormalizado = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!nomeNormalizado || !emailNormalizado || typeof senha !== 'string' || !senha) {
      throw { status: 400, message: "Campos obrigatórios ausentes: nome, email ou senha." };
    }

    const usuarioExistente = repository.buscarUsuarioPorEmail(emailNormalizado);
    if (usuarioExistente) {
      throw { status: 409, message: "E-mail já cadastrado no sistema." };
    }

    const senha_hash = await bcrypt.hash(senha, BCRYPT_SALT_ROUNDS);

    const novoUsuario = repository.salvarUsuario({
      nome: nomeNormalizado,
      email: emailNormalizado,
      senha_hash,
      role: "USER"
    });

    const { senha_hash: _, ...usuarioRetorno } = novoUsuario;
    return usuarioRetorno;
  }

  async login({ email, senha }) {
    if (!email || !senha) {
      throw { status: 400, message: "E-mail e senha são obrigatórios." };
    }

    const emailNormalizado = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const usuario = repository.buscarUsuarioPorEmail(emailNormalizado);
    const senhaValida = usuario
      ? await bcrypt.compare(senha, usuario.senha_hash)
      : false;

    if (!usuario || !senhaValida) {
      throw { status: 401, message: "Credenciais inválidas." };
    }

    const token = jwt.sign(
      {
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      },
      JWT_SECRET,
      {
        subject: String(usuario.id),
        expiresIn: JWT_EXPIRES_IN
      }
    );

    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      },
      token,
      tipo: "Bearer"
    };
  }
}

module.exports = new AuthService();
