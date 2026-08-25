// server.js
require('dotenv').config(); // Carrega as variáveis do arquivo .env
// O agendador contínuo só deve rodar no servidor local. Na Vercel, tarefas
// programadas precisam ser acionadas por uma rota de Vercel Cron.
if (!process.env.VERCEL) {
    require('./backend/cron/notificador');
}
const express = require('express');
const cors = require('cors');
const db = require('./backend/config/database');
const usuarioRoutes = require('./backend/routes/usuarioRoutes');
const agendamentoRoutes = require('./backend/routes/agendamentoRoutes'); 
const cursoRoutes = require('./backend/routes/cursoRoutes'); 
const disponibilidadeRoutes = require('./backend/routes/disponibilidadeRoutes');
const path = require('path'); // Adicione esta linha para lidar com caminhos de pastas



const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Libera o acesso do Front-end
app.use(express.json()); // Ensina o Express a entender requisições no formato JSON

// A LINHA MÁGICA DA OPÇÃO 2:
// Entrega localmente os mesmos arquivos públicos que a Vercel publica via CDN.
app.use(express.static(path.join(__dirname, 'public')));


// Rota de teste simples
app.get('/api/status', (req, res) => {
    res.json({ mensagem: "Servidor Connect Senac rodando com sucesso!", status: "OK" });
});


// Usando as rotas na API
// Todas as rotas de usuário terão o prefixo /api/usuarios
app.use('/api/usuarios', usuarioRoutes)
app.use('/api/agendamentos', agendamentoRoutes)
app.use('/api/cursos', cursoRoutes)
app.use('/api/disponibilidades', disponibilidadeRoutes)
app.use('/api/dashboard', require('./backend/routes/dashboardRoutes'));
app.use('/api/admin', require('./backend/routes/adminRoutes'));
app.use('/api/profissional', require('./backend/routes/profissionalRoutes'));
app.use('/api/feedbacks', require('./backend/routes/feedbackRoutes'));



// A Vercel importa o app como uma Function. O listener é necessário apenas
// ao executar o projeto localmente com `npm start`.
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(`Acesse: http://localhost:${PORT}/api/status`);
    });
}

module.exports = app;
