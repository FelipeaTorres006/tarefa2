/**
 * Especificação OpenAPI 3.0 da Livraria API.
 *
 * Fonte da verdade do contrato: os services (validações e mensagens de erro),
 * o authMiddleware (401/403) e o errorMiddleware (todo erro é `{ "erro": string }`).
 * As mensagens de exemplo abaixo são as literais devolvidas pela API.
 */

const DESCRICAO = `
API RESTful de Livros e Autores com autenticação **stateless** por JWT, senhas em hash
BCrypt e controle de acesso por perfil (RBAC).

### Como testar as rotas protegidas

1. Chame \`POST /auth/login\` com uma das credenciais da tabela abaixo.
2. Copie o valor do campo \`token\` da resposta.
3. Clique em **Authorize** (no topo à direita), cole **apenas o token** — sem o prefixo
   \`Bearer\`, que o Swagger UI adiciona sozinho — e confirme.
4. As rotas com 🔒 passam a enviar o header \`Authorization: Bearer <token>\`.

### Credenciais de teste

| Perfil | E-mail | Senha | Role |
|--------|--------|-------|------|
| Admin  | admin@livraria.com | admin123  | \`ADMIN\` |
| Leitor | leitor@gmail.com   | leitor123 | \`USER\`  |

Cadastros feitos em \`POST /auth/register\` recebem sempre a role \`USER\`: a role não é
aceita do corpo da requisição, para que ninguém se promova a administrador.

### Erros

Toda falha responde com o mesmo formato, \`{ "erro": "mensagem" }\`. O token expira em 1h
(padrão de \`JWT_EXPIRES_IN\`); depois disso as rotas protegidas voltam a responder 401.
`.trim();

/** Resposta de erro reutilizável: um status, uma mensagem literal da API. */
function respostaErro(description, exemplo) {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Erro' },
        example: { erro: exemplo }
      }
    }
  };
}

module.exports = {
  openapi: '3.0.3',

  info: {
    title: 'Livraria API',
    version: '1.0.0',
    description: DESCRICAO
  },

  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Ambiente local de desenvolvimento'
    }
  ],

  tags: [
    {
      name: 'Autenticação',
      description: 'Cadastro de usuários e emissão de token JWT. Rotas públicas.'
    },
    {
      name: 'Livros',
      description: 'Consulta pública do acervo; cadastro restrito a ADMIN; comentários para qualquer usuário autenticado.'
    },
    {
      name: 'Autores',
      description: 'Consulta pública; cadastro restrito a ADMIN.'
    }
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT (HS256) obtido em `POST /auth/login`. Enviado no header `Authorization: Bearer <token>`.'
      }
    },

    schemas: {
      Erro: {
        type: 'object',
        description: 'Formato único de erro da API, em qualquer status de falha.',
        required: ['erro'],
        properties: {
          erro: {
            type: 'string',
            description: 'Mensagem legível da falha.',
            example: 'Livro não localizado.'
          }
        }
      },

      Autor: {
        type: 'object',
        required: ['id', 'nome', 'nacionalidade'],
        properties: {
          id: { type: 'integer', description: 'Identificador do autor.', example: 1 },
          nome: { type: 'string', example: 'Machado de Assis' },
          nacionalidade: { type: 'string', example: 'Brasileiro' }
        }
      },

      AutorInput: {
        type: 'object',
        required: ['nome'],
        properties: {
          nome: {
            type: 'string',
            description: 'Nome do autor. Obrigatório, não pode ser vazio nem só espaços.',
            example: 'Clarice Lispector'
          },
          nacionalidade: {
            type: 'string',
            description: 'Opcional. Ausente ou vazia, é gravada como "Não informada".',
            example: 'Brasileira'
          }
        }
      },

      Comentario: {
        type: 'object',
        required: ['id', 'autor_nome', 'texto'],
        properties: {
          id: { type: 'integer', example: 1 },
          autor_nome: {
            type: 'string',
            description: 'Nome do autor do comentário, extraído do token JWT — nunca do corpo da requisição.',
            example: 'Leitor'
          },
          texto: { type: 'string', example: 'Clássico indispensável.' }
        }
      },

      ComentarioInput: {
        type: 'object',
        required: ['texto'],
        properties: {
          texto: {
            type: 'string',
            description: 'Conteúdo do comentário. Obrigatório, não pode ser vazio nem só espaços.',
            example: 'Releitura obrigatória, envelheceu muito bem.'
          }
        }
      },

      Livro: {
        type: 'object',
        description: 'Livro como é persistido. Formato devolvido por `POST /livros`.',
        required: ['id', 'titulo', 'ano', 'autor_id', 'comentarios'],
        properties: {
          id: { type: 'integer', example: 1761000000000 },
          titulo: { type: 'string', example: 'Memórias Póstumas de Brás Cubas' },
          ano: { type: 'integer', example: 1881 },
          autor_id: {
            type: 'integer',
            description: 'Identificador do autor já cadastrado.',
            example: 1
          },
          comentarios: {
            type: 'array',
            description: 'Comentários do livro. Sempre vazio no momento da criação.',
            items: { $ref: '#/components/schemas/Comentario' },
            example: []
          }
        }
      },

      LivroComAutor: {
        type: 'object',
        description: 'Livro com o nome do autor resolvido. Formato devolvido pelas rotas de consulta.',
        required: ['id', 'titulo', 'ano', 'autor_id', 'autor_nome', 'comentarios'],
        properties: {
          id: { type: 'integer', example: 1 },
          titulo: { type: 'string', example: 'Dom Casmurro' },
          ano: { type: 'integer', example: 1899 },
          autor_id: { type: 'integer', example: 1 },
          autor_nome: {
            type: 'string',
            description: 'Derivado do `autor_id` na leitura; não é um campo armazenado. Vale "Autor Desconhecido" se o autor não existir mais.',
            example: 'Machado de Assis'
          },
          comentarios: {
            type: 'array',
            items: { $ref: '#/components/schemas/Comentario' }
          }
        }
      },

      LivroInput: {
        type: 'object',
        required: ['titulo', 'autor_id'],
        properties: {
          titulo: {
            type: 'string',
            description: 'Título do livro. Obrigatório.',
            example: 'Memórias Póstumas de Brás Cubas'
          },
          autor_id: {
            type: 'integer',
            description: 'Obrigatório. O autor precisa já existir — caso contrário a resposta é 404.',
            example: 1
          },
          ano: {
            type: 'integer',
            description: 'Opcional. Ausente, assume o ano corrente.',
            example: 1881
          }
        }
      },

      Usuario: {
        type: 'object',
        description: 'Usuário sem o hash da senha, que nunca sai nas respostas.',
        required: ['id', 'nome', 'email', 'role'],
        properties: {
          id: { type: 'integer', example: 1761000000000 },
          nome: { type: 'string', example: 'Maria Souza' },
          email: {
            type: 'string',
            description: 'Normalizado em minúsculas e sem espaços nas pontas.',
            example: 'maria.souza@gmail.com'
          },
          role: {
            type: 'string',
            enum: ['USER', 'ADMIN'],
            description: 'Perfil de acesso. Cadastros públicos recebem sempre `USER`.',
            example: 'USER'
          }
        }
      },

      RegisterInput: {
        type: 'object',
        required: ['nome', 'email', 'senha'],
        properties: {
          nome: { type: 'string', example: 'Maria Souza' },
          email: {
            type: 'string',
            description: 'Precisa ser único na base — e-mail repetido responde 409.',
            example: 'maria.souza@gmail.com'
          },
          senha: {
            type: 'string',
            format: 'password',
            description: 'Armazenada apenas como hash BCrypt, nunca em texto.',
            example: 'senhaSegura123'
          }
        }
      },

      LoginInput: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', example: 'admin@livraria.com' },
          senha: { type: 'string', format: 'password', example: 'admin123' }
        }
      },

      LoginResponse: {
        type: 'object',
        required: ['usuario', 'token', 'tipo'],
        properties: {
          usuario: { $ref: '#/components/schemas/Usuario' },
          token: {
            type: 'string',
            description: 'JWT assinado em HS256, com `sub` (id), `nome`, `email` e `role`. Válido por 1h no padrão.',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub21lIjoiQWRtaW4iLCJyb2xlIjoiQURNSU4ifQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
          },
          tipo: {
            type: 'string',
            description: 'Esquema de autenticação a usar no header `Authorization`.',
            example: 'Bearer'
          }
        }
      }
    },

    responses: {
      NaoAutenticado: respostaErro(
        'Token ausente, com formato diferente de `Bearer <token>`, inválido (assinatura não confere) ou expirado.',
        'Token de autenticação não fornecido ou formato inválido.'
      ),
      Proibido: respostaErro(
        'Token válido, mas a role do usuário não alcança a rota. Rota exclusiva de ADMIN.',
        'Acesso proibido: privilégio de ADMIN exigido.'
      ),
      ErroInterno: respostaErro(
        'Falha inesperada no servidor.',
        'Ocorreu um erro interno no servidor.'
      )
    },

    parameters: {
      LivroId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Identificador do livro. Valor não numérico não encontra registro e responde 404 (não 400).',
        schema: { type: 'integer' },
        example: 1
      }
    }
  },

  paths: {
    '/auth/register': {
      post: {
        tags: ['Autenticação'],
        operationId: 'registrarUsuario',
        summary: 'Cadastra um usuário',
        security: [],
        description: [
          'Rota **pública**. Cria um usuário com a senha convertida em hash BCrypt — a senha em texto nunca é armazenada nem devolvida.',
          '',
          'A role é fixada em `USER` pelo servidor e ignorada se vier no corpo, para que ninguém se promova a ADMIN pelo cadastro.',
          'O e-mail é normalizado (minúsculas, sem espaços nas pontas) e precisa ser único.'
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterInput' },
              example: {
                nome: 'Maria Souza',
                email: 'maria.souza@gmail.com',
                senha: 'senhaSegura123'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Usuário criado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Usuario' },
                example: {
                  id: 1761000000000,
                  nome: 'Maria Souza',
                  email: 'maria.souza@gmail.com',
                  role: 'USER'
                }
              }
            }
          },
          400: respostaErro(
            'Falha de validação: `nome`, `email` ou `senha` ausente ou vazio.',
            'Campos obrigatórios ausentes: nome, email ou senha.'
          ),
          409: respostaErro(
            'Conflito: o e-mail já pertence a outro usuário.',
            'E-mail já cadastrado no sistema.'
          ),
          500: { $ref: '#/components/responses/ErroInterno' }
        }
      }
    },

    '/auth/login': {
      post: {
        tags: ['Autenticação'],
        operationId: 'login',
        summary: 'Autentica e emite o token JWT',
        security: [],
        description: [
          'Rota **pública**. Compara a senha com o hash BCrypt armazenado e, em caso de acerto, assina um JWT HS256.',
          '',
          'Use o campo `token` da resposta no botão **Authorize** para liberar as rotas protegidas nesta página.',
          '',
          'E-mail inexistente e senha errada devolvem o **mesmo** 401 com a mensagem genérica "Credenciais inválidas.", para não revelar quais e-mails existem na base.'
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' },
              examples: {
                admin: {
                  summary: 'Administrador (libera as rotas de ADMIN)',
                  value: { email: 'admin@livraria.com', senha: 'admin123' }
                },
                leitor: {
                  summary: 'Leitor (role USER — recebe 403 nas rotas de ADMIN)',
                  value: { email: 'leitor@gmail.com', senha: 'leitor123' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Autenticado. Token emitido.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
                example: {
                  usuario: { id: 1, nome: 'Admin', email: 'admin@livraria.com', role: 'ADMIN' },
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub21lIjoiQWRtaW4iLCJyb2xlIjoiQURNSU4ifQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                  tipo: 'Bearer'
                }
              }
            }
          },
          400: respostaErro(
            'Falha de validação: `email` ou `senha` ausente.',
            'E-mail e senha são obrigatórios.'
          ),
          401: respostaErro(
            'E-mail não cadastrado ou senha incorreta — mensagem genérica por decisão de segurança.',
            'Credenciais inválidas.'
          ),
          500: { $ref: '#/components/responses/ErroInterno' }
        }
      }
    },

    '/livros': {
      get: {
        tags: ['Livros'],
        operationId: 'listarLivros',
        summary: 'Lista os livros do acervo',
        security: [],
        description: [
          'Rota **pública**, sem token. Devolve todos os livros com `autor_nome` resolvido a partir do `autor_id`.',
          '',
          'Sem paginação e sem filtros: o array pode vir vazio se o acervo estiver sem registros.'
        ].join('\n'),
        responses: {
          200: {
            description: 'Lista de livros (possivelmente vazia).',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/LivroComAutor' }
                },
                example: [
                  {
                    id: 1,
                    titulo: 'Dom Casmurro',
                    ano: 1899,
                    autor_id: 1,
                    autor_nome: 'Machado de Assis',
                    comentarios: [
                      { id: 1, autor_nome: 'Leitor', texto: 'Clássico indispensável.' }
                    ]
                  }
                ]
              }
            }
          },
          500: { $ref: '#/components/responses/ErroInterno' }
        }
      },

      post: {
        tags: ['Livros'],
        operationId: 'criarLivro',
        summary: 'Cadastra um livro',
        description: [
          'Rota **exclusiva de ADMIN**: exige token válido (401 sem ele) e role `ADMIN` (403 para `USER`).',
          '',
          'O `autor_id` precisa apontar para um autor existente — se não existir, a resposta é 404.',
          'O livro nasce com `comentarios: []`, e a resposta **não** traz `autor_nome` (campo só das rotas de consulta).'
        ].join('\n'),
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LivroInput' },
              example: {
                titulo: 'Memórias Póstumas de Brás Cubas',
                ano: 1881,
                autor_id: 1
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Livro criado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Livro' },
                example: {
                  id: 1761000000000,
                  titulo: 'Memórias Póstumas de Brás Cubas',
                  ano: 1881,
                  autor_id: 1,
                  comentarios: []
                }
              }
            }
          },
          400: respostaErro(
            'Falha de validação: `titulo` ou `autor_id` ausente.',
            'O título e o autor_id são obrigatórios.'
          ),
          401: { $ref: '#/components/responses/NaoAutenticado' },
          403: { $ref: '#/components/responses/Proibido' },
          404: respostaErro(
            'O `autor_id` informado não corresponde a nenhum autor cadastrado.',
            'O autor informado não existe.'
          ),
          500: { $ref: '#/components/responses/ErroInterno' }
        }
      }
    },

    '/livros/{id}': {
      get: {
        tags: ['Livros'],
        operationId: 'detalharLivro',
        summary: 'Detalha um livro',
        security: [],
        description: [
          'Rota **pública**, sem token. Devolve o livro com `autor_nome` resolvido e a lista completa de comentários.'
        ].join('\n'),
        parameters: [{ $ref: '#/components/parameters/LivroId' }],
        responses: {
          200: {
            description: 'Livro encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LivroComAutor' },
                example: {
                  id: 1,
                  titulo: 'Dom Casmurro',
                  ano: 1899,
                  autor_id: 1,
                  autor_nome: 'Machado de Assis',
                  comentarios: [
                    { id: 1, autor_nome: 'Leitor', texto: 'Clássico indispensável.' }
                  ]
                }
              }
            }
          },
          404: respostaErro(
            'Nenhum livro com esse `id`. Também é a resposta para um `id` não numérico.',
            'Livro não localizado.'
          ),
          500: { $ref: '#/components/responses/ErroInterno' }
        }
      }
    },

    '/livros/{id}/comentarios': {
      post: {
        tags: ['Livros'],
        operationId: 'comentarLivro',
        summary: 'Comenta em um livro',
        description: [
          'Rota **autenticada**, aberta a qualquer role (`USER` ou `ADMIN`): basta um token válido, não há exigência de privilégio — portanto não responde 403.',
          '',
          'O `autor_nome` do comentário é extraído do token (claim `nome`) e **não** é lido do corpo, para que ninguém comente em nome de outro. O único campo aceito é `texto`.'
        ].join('\n'),
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/LivroId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ComentarioInput' },
              example: { texto: 'Releitura obrigatória, envelheceu muito bem.' }
            }
          }
        },
        responses: {
          201: {
            description: 'Comentário registrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Comentario' },
                example: {
                  id: 1761000000000,
                  autor_nome: 'Leitor',
                  texto: 'Releitura obrigatória, envelheceu muito bem.'
                }
              }
            }
          },
          400: respostaErro(
            'Falha de validação: `texto` ausente, vazio ou só com espaços.',
            'O texto do comentário não pode estar vazio.'
          ),
          401: { $ref: '#/components/responses/NaoAutenticado' },
          404: respostaErro(
            'Nenhum livro com esse `id`.',
            'Livro não localizado.'
          ),
          500: { $ref: '#/components/responses/ErroInterno' }
        }
      }
    },

    '/autores': {
      get: {
        tags: ['Autores'],
        operationId: 'listarAutores',
        summary: 'Lista os autores',
        description: 'Rota **pública**, sem token. Devolve todos os autores cadastrados, sem paginação.',
        security: [],
        responses: {
          200: {
            description: 'Lista de autores (possivelmente vazia).',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Autor' }
                },
                example: [
                  { id: 1, nome: 'Machado de Assis', nacionalidade: 'Brasileiro' }
                ]
              }
            }
          },
          500: { $ref: '#/components/responses/ErroInterno' }
        }
      },

      post: {
        tags: ['Autores'],
        operationId: 'criarAutor',
        summary: 'Cadastra um autor',
        description: [
          'Rota **exclusiva de ADMIN**: exige token válido (401 sem ele) e role `ADMIN` (403 para `USER`).',
          '',
          'Só `nome` é obrigatório. Sem `nacionalidade`, o autor é gravado com "Não informada".'
        ].join('\n'),
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AutorInput' },
              example: { nome: 'Clarice Lispector', nacionalidade: 'Brasileira' }
            }
          }
        },
        responses: {
          201: {
            description: 'Autor criado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Autor' },
                example: {
                  id: 1761000000000,
                  nome: 'Clarice Lispector',
                  nacionalidade: 'Brasileira'
                }
              }
            }
          },
          400: respostaErro(
            'Falha de validação: `nome` ausente, vazio ou só com espaços.',
            'O nome do autor é obrigatório.'
          ),
          401: { $ref: '#/components/responses/NaoAutenticado' },
          403: { $ref: '#/components/responses/Proibido' },
          500: { $ref: '#/components/responses/ErroInterno' }
        }
      }
    }
  }
};
