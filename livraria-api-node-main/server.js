const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/authRoutes');
const livroRoutes = require('./routes/livroRoutes');
const autorRoutes = require('./routes/autorRoutes');
const errorHandler = require('./middlewares/errorMiddleware');
const openapiSpec = require('./docs/openapi');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Documentação: especificação bruta antes da UI, senão o /docs a captura
app.get('/docs/api.json', (req, res) => res.json(openapiSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'Livraria API — documentação',
  swaggerOptions: { persistAuthorization: true }
}));

// Agrupamento Semântico de Rotas (RESTful /api/v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/livros', livroRoutes);
app.use('/api/v1/autores', autorRoutes);

// Rota inexistente responde no mesmo contrato de erro das demais
app.use((req, res) => {
  res.status(404).json({ erro: "Recurso não encontrado." });
});

// Middleware Global de Tratamento de Erros
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Livraria API rodando em http://localhost:${PORT}`);
});