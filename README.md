# Tarefa 2 — Camada de segurança da Livraria API

Autenticação JWT, senhas em BCrypt e RBAC por middlewares sobre a API RESTful de
Livros e Autores em Clean Architecture.

- [`livraria-api-node-main/`](livraria-api-node-main/) — a API. A documentação da camada de
  segurança, a matriz de permissões e as credenciais de teste estão no
  [README da API](livraria-api-node-main/README.md).
- [`index.html`](index.html) — front-end de laboratório: faz login, guarda o JWT e envia o
  header `Authorization: Bearer <token>` nas rotas protegidas.

## Rodando

```bash
cd livraria-api-node-main
npm install
npm start                       # http://localhost:3000
```

Depois abra o `index.html` no navegador.

## Verificando a matriz de permissões

Com o servidor rodando:

```bash
bash livraria-api-node-main/scripts/teste-seguranca.sh
```

Cobre os 23 casos da matriz — rotas públicas, login válido e inválido, cadastro, comentários
de usuário autenticado, rotas exclusivas de `ADMIN` recusando anônimo (401) e `USER` (403),
além de token forjado com outra chave e token expirado.
