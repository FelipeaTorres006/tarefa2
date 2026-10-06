const fs = require('fs');
const path = require('path');

const CREDENCIAIS_PADRAO = [
  {
    id: 1,
    nome: "Admin",
    email: "admin@livraria.com",
    senha_hash: "$2b$10$DAG6f6dwuBhRAWlSt6YbluKagL91hl4QYtZAoL/ruqJmJAPkzRHg2",
    role: "ADMIN"
  },
  {
    id: 2,
    nome: "Leitor",
    email: "leitor@gmail.com",
    senha_hash: "$2b$10$UcYF.bJUPRBdNIQoLzybLeXleMZiwRenMEQpzkafSdtY5CyvXpNQ2",
    role: "USER"
  }
];

class LivrariaRepository {
  constructor() {
    // Garante que o arquivo fique na raiz do projeto (onde o server.js roda)
    this.dbPath = path.resolve(process.cwd(), 'database.txt');
    this._garantirArquivoInicial();
  }

  _obterDadosPadrao() {
    return {
      usuarios: CREDENCIAIS_PADRAO.map(usuario => ({ ...usuario })),
      autores: [
        { id: 1, nome: "Machado de Assis", nacionalidade: "Brasileiro" }
      ],
      livros: [
        {
          id: 1,
          titulo: "Dom Casmurro",
          ano: 1899,
          autor_id: 1,
          comentarios: [
            { id: 1, autor_nome: "Leitor", texto: "Clássico indispensável." }
          ]
        }
      ]
    };
  }

  _garantirArquivoInicial() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        this.salvar(this._obterDadosPadrao());
      } else {
        const conteudo = fs.readFileSync(this.dbPath, 'utf-8').trim();
        if (!conteudo) {
          this.salvar(this._obterDadosPadrao());
        } else {
          const dados = JSON.parse(conteudo);
          const usuarios = Array.isArray(dados.usuarios) ? dados.usuarios : [];
          let alterado = false;

          CREDENCIAIS_PADRAO.forEach(credencial => {
            const usuario = usuarios.find(item => item.email === credencial.email);
            if (!usuario) {
              usuarios.push({ ...credencial });
              alterado = true;
              return;
            }

            if (usuario.senha_hash !== credencial.senha_hash || usuario.role !== credencial.role) {
              usuario.senha_hash = credencial.senha_hash;
              usuario.role = credencial.role;
              alterado = true;
            }
          });

          if (dados.usuarios !== usuarios) {
            dados.usuarios = usuarios;
            alterado = true;
          }

          if (alterado) this.salvar(dados);
        }
      }
    } catch (err) {
      console.error("Erro ao inicializar database.txt:", err);
    }
  }

  carregar() {
    try {
      this._garantirArquivoInicial();
      const rawData = fs.readFileSync(this.dbPath, 'utf-8');
      return JSON.parse(rawData);
    } catch (e) {
      return this._obterDadosPadrao();
    }
  }

  salvar(dados) {
    fs.writeFileSync(this.dbPath, JSON.stringify(dados, null, 2), 'utf-8');
  }

  // Métodos de Usuários
  buscarUsuarioPorEmail(email) {
    const db = this.carregar();
    const emailNormalizado = String(email).trim().toLowerCase();
    return db.usuarios.find(u => u.email.toLowerCase() === emailNormalizado) || null;
  }

  salvarUsuario(usuario) {
    const db = this.carregar();
    const novoUsuario = { id: Date.now(), ...usuario };
    db.usuarios.push(novoUsuario);
    this.salvar(db);
    return novoUsuario;
  }

  // Métodos de Autores
  listarAutores() {
    return this.carregar().autores || [];
  }

  buscarAutorPorId(id) {
    return (this.carregar().autores || []).find(a => a.id === Number(id)) || null;
  }

  salvarAutor(autor) {
    const db = this.carregar();
    const novoAutor = { id: Date.now(), ...autor };
    db.autores.push(novoAutor);
    this.salvar(db);
    return novoAutor;
  }

  // Métodos de Livros
  listarLivros() {
    return this.carregar().livros || [];
  }

  buscarLivroPorId(id) {
    return (this.carregar().livros || []).find(l => l.id === Number(id)) || null;
  }

  salvarLivro(livro) {
    const db = this.carregar();
    const novoLivro = { id: Date.now(), ...livro, comentarios: [] };
    db.livros.push(novoLivro);
    this.salvar(db);
    return novoLivro;
  }

  adicionarComentario(livroId, comentario) {
    const db = this.carregar();
    const livro = db.livros.find(l => l.id === Number(livroId));
    if (!livro) return null;

    if (!livro.comentarios) livro.comentarios = [];

    const novoComentario = { id: Date.now(), ...comentario };
    livro.comentarios.push(novoComentario);
    this.salvar(db);
    return novoComentario;
  }
}

module.exports = new LivrariaRepository();
