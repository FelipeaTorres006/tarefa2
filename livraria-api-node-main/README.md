# Livraria API — camada de segurança

API RESTful de Livros e Autores em Clean Architecture, com autenticação stateless por JWT,
senhas em hash BCrypt e controle de acesso por perfil (RBAC) aplicado em middlewares.

## Como rodar

```bash
npm install
npm start          # http://localhost:3000
```

O arquivo `database.txt` é criado na primeira execução, já semeado com os usuários abaixo.
Para front-end, abra o `index.html` da raiz do repositório no navegador.

## Credenciais de teste

| Perfil | E-mail              | Senha      | Role    |
|--------|---------------------|------------|---------|
| Admin  | admin@livraria.com  | admin123   | `ADMIN` |
| Leitor | leitor@gmail.com    | leitor123  | `USER`  |

Novos cadastros via `POST /api/v1/auth/register` recebem sempre a role `USER` — a role
não é aceita do corpo da requisição, para que ninguém se promova a administrador.

## Matriz de permissões

| Método | Rota                             | Acesso               | Sucesso | Falha de segurança |
|--------|----------------------------------|----------------------|---------|--------------------|
| GET    | `/api/v1/livros`                 | Público              | 200     | —                  |
| GET    | `/api/v1/livros/:id`             | Público              | 200     | —                  |
| POST   | `/api/v1/auth/register`          | Público              | 201     | —                  |
| POST   | `/api/v1/auth/login`             | Público              | 200     | 401                |
| POST   | `/api/v1/livros/:id/comentarios` | `USER` ou `ADMIN`    | 201     | 401                |
| POST   | `/api/v1/autores`                | Exclusivo `ADMIN`    | 201     | 401 / 403          |
| POST   | `/api/v1/livros`                 | Exclusivo `ADMIN`    | 201     | 401 / 403          |

`401` quando falta o token, o formato não é `Bearer <token>`, a assinatura não confere ou o
token expirou. `403` quando o token é válido mas a role não alcança a rota.

## Como a segurança está montada

**Armazenamento de credenciais** — `services/AuthService.js` nunca guarda a senha em texto.
No cadastro ela passa por `bcrypt.hash` com o work factor de `config/auth.js` (padrão 10); o
BCrypt gera um salt próprio por usuário, embutido no hash — por isso dois usuários com a mesma
senha têm hashes diferentes. No login a comparação é `bcrypt.compare`. O hash nunca sai nas
respostas: `registrar` descarta `senha_hash` antes de retornar.

Login com e-mail inexistente e login com senha errada devolvem a mesma mensagem genérica
("Credenciais inválidas", 401), para não revelar quais e-mails existem na base.

**Autenticação stateless** — o login assina um JWT HS256 com `sub` (id), `nome`, `email` e
`role`, válido por `JWT_EXPIRES_IN`. O servidor não guarda sessão: toda requisição protegida
é validada só pela assinatura do token.

**RBAC em middlewares** — `middlewares/authMiddleware.js` expõe dois middlewares encadeáveis:

- `autenticarToken` — exige o header `Authorization: Bearer <token>`, verifica a assinatura e
  popula `req.usuario`. Responde 401 em token ausente, malformado, inválido ou expirado.
- `exigirRole('ADMIN')` — roda depois da autenticação e responde 403 se a role do token não
  estiver na lista exigida.

As rotas declaram a própria exigência, então a regra de acesso fica legível em um lugar só
(`routes/livroRoutes.js`, `routes/autorRoutes.js`):

```js
router.get('/', controller.index);                                    // público
router.post('/', autenticarToken, exigirRole('ADMIN'), ...);          // só ADMIN
router.post('/:id/comentarios', autenticarToken, ...);                // qualquer autenticado
```

O autor do comentário vem de `req.usuario`, extraído do token — nunca do corpo da requisição,
para que ninguém comente no nome de outro.

## Configuração

Variáveis opcionais, com padrão de desenvolvimento em `config/auth.js`. Copie `.env.example`
e exporte-as no ambiente para produção:

| Variável              | Padrão | Função                                         |
|-----------------------|--------|------------------------------------------------|
| `JWT_SECRET`          | chave de desenvolvimento | segredo de assinatura do JWT |
| `JWT_EXPIRES_IN`      | `1h`   | validade do token                              |
| `BCRYPT_SALT_ROUNDS`  | `10`   | work factor do BCrypt (mínimo 8)               |

A aplicação falha ao subir se `BCRYPT_SALT_ROUNDS` for menor que 8.

## Teste manual rápido

```bash
# público
curl -i http://localhost:3000/api/v1/livros

# login e captura do token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@livraria.com","senha":"admin123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')

# rota de ADMIN com token
curl -i -X POST http://localhost:3000/api/v1/autores \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"nome":"Clarice Lispector","nacionalidade":"Brasileira"}'

# rota de ADMIN sem token -> 401
curl -i -X POST http://localhost:3000/api/v1/autores \
  -H 'Content-Type: application/json' -d '{"nome":"X"}'
```

Um script que cobre a matriz inteira (23 casos, incluindo token expirado e token assinado com
outra chave) está em `scripts/teste-seguranca.sh`:

```bash
npm start &                      # em outro terminal
bash scripts/teste-seguranca.sh
```
