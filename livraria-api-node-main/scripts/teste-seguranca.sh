#!/usr/bin/env bash
# Cobre a matriz de permissões da API. Exige o servidor rodando (npm start).
API=${API:-http://localhost:3000/api/v1}
PASS=0; FAIL=0
BODY=$(mktemp); trap 'rm -f "$BODY"' EXIT

ok(){ if [ "$1" = "$2" ]; then echo "PASS  $3 -> $1"; PASS=$((PASS+1));
      else echo "FAIL  $3 -> esperado $2, obtido $1"; FAIL=$((FAIL+1)); fi; }
st(){ curl -s -o "$BODY" -w '%{http_code}' "$@"; }
token(){ sed -E 's/.*"token":"([^"]+)".*/\1/' <<< "$1"; }

echo "== Rotas públicas =="
ok "$(st "$API/livros")"       200 "GET /livros"
ok "$(st "$API/livros/1")"     200 "GET /livros/1"
ok "$(st "$API/livros/99999")" 404 "GET /livros/99999"

echo "== Login =="
ADMIN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@livraria.com","senha":"admin123"}')
grep -q '"role":"ADMIN"' <<< "$ADMIN" \
  && { echo "PASS  login admin devolve role ADMIN"; PASS=$((PASS+1)); } \
  || { echo "FAIL  login admin: $ADMIN";            FAIL=$((FAIL+1)); }
TA=$(token "$ADMIN")

USER=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"leitor@gmail.com","senha":"leitor123"}')
grep -q '"role":"USER"' <<< "$USER" \
  && { echo "PASS  login leitor devolve role USER"; PASS=$((PASS+1)); } \
  || { echo "FAIL  login leitor: $USER";            FAIL=$((FAIL+1)); }
TU=$(token "$USER")

ok "$(st -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@livraria.com","senha":"errada"}')" 401 "login com senha errada"
ok "$(st -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"naoexiste@x.com","senha":"x"}')"         401 "login com e-mail inexistente"

echo "== Cadastro =="
EMAIL="novo-$RANDOM-$RANDOM@teste.com"
ok "$(st -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"nome\":\"Novo\",\"email\":\"$EMAIL\",\"senha\":\"senha123\"}")" 201 "POST /auth/register"
grep -q senha_hash "$BODY" \
  && { echo "FAIL  resposta do register vazou senha_hash"; FAIL=$((FAIL+1)); } \
  || { echo "PASS  resposta do register não expõe o hash"; PASS=$((PASS+1)); }
ok "$(st -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"nome\":\"Novo\",\"email\":\"$EMAIL\",\"senha\":\"senha123\"}")" 409 "register com e-mail duplicado"

echo "== Comentários (autenticado) =="
ok "$(st -X POST "$API/livros/1/comentarios" -H 'Content-Type: application/json' \
  -d '{"texto":"anônimo"}')" 401 "comentário sem token"
ok "$(st -X POST "$API/livros/1/comentarios" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TU" -d '{"texto":"comentário do leitor"}')" 201 "comentário como USER"
ok "$(st -X POST "$API/livros/1/comentarios" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TA" -d '{"texto":"comentário do admin"}')" 201 "comentário como ADMIN"
ok "$(st -X POST "$API/livros/1/comentarios" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer lixo" -d '{"texto":"x"}')" 401 "comentário com token inválido"
ok "$(st -X POST "$API/livros/1/comentarios" -H 'Content-Type: application/json' \
  -H "Authorization: $TU" -d '{"texto":"x"}')" 401 "comentário sem o prefixo Bearer"

echo "== POST /autores (só ADMIN) =="
ok "$(st -X POST "$API/autores" -H 'Content-Type: application/json' \
  -d '{"nome":"A"}')" 401 "sem token"
ok "$(st -X POST "$API/autores" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TU" -d '{"nome":"A"}')" 403 "como USER"
ok "$(st -X POST "$API/autores" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TA" -d '{"nome":"Autor de Teste","nacionalidade":"Brasileiro"}')" 201 "como ADMIN"

echo "== POST /livros (só ADMIN) =="
ok "$(st -X POST "$API/livros" -H 'Content-Type: application/json' \
  -d '{"titulo":"X","autor_id":1}')" 401 "sem token"
ok "$(st -X POST "$API/livros" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TU" -d '{"titulo":"X","autor_id":1}')" 403 "como USER"
ok "$(st -X POST "$API/livros" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TA" -d '{"titulo":"Livro de Teste","ano":2026,"autor_id":1}')" 201 "como ADMIN"

echo "== Tokens forjados e expirados =="
SECRET=${JWT_SECRET:-livraria-api-chave-secreta-desenvolvimento}
FORJADO=$(node -e 'console.log(require("jsonwebtoken").sign({role:"ADMIN"},"outra-chave",{subject:"1"}))')
ok "$(st -X POST "$API/livros" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $FORJADO" -d '{"titulo":"X","autor_id":1}')" 401 "token assinado com outra chave"
EXPIRADO=$(SECRET="$SECRET" node -e 'console.log(require("jsonwebtoken").sign({role:"ADMIN"},process.env.SECRET,{subject:"1",expiresIn:-10}))')
ok "$(st -X POST "$API/livros" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $EXPIRADO" -d '{"titulo":"X","autor_id":1}')" 401 "token expirado"

echo
echo "$PASS passaram, $FAIL falharam"
[ "$FAIL" -eq 0 ]
