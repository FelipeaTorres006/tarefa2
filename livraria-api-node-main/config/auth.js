const JWT_SECRET = process.env.JWT_SECRET || 'livraria-api-chave-secreta-desenvolvimento';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

if (!Number.isInteger(BCRYPT_SALT_ROUNDS) || BCRYPT_SALT_ROUNDS < 8) {
  throw new Error('BCRYPT_SALT_ROUNDS deve ser um inteiro maior ou igual a 8.');
}

module.exports = { JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_SALT_ROUNDS };
