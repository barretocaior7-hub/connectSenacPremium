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
const fs = require('fs');



const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Libera o acesso do Front-end
app.use(express.json({ limit: '10mb' })); // Suporta envio de imagens base64/arquivos
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// A LINHA MÁGICA DA OPÇÃO 2:
// Entrega localmente os mesmos arquivos públicos que a Vercel publica via CDN.
app.use(express.static(path.join(__dirname, 'public')));


// Rota de teste simples
app.get('/api/status', (req, res) => {
    res.json({ mensagem: "Servidor Connect Senac rodando com sucesso!", status: "OK" });
});

const escaparHtml = (valor = '') => String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const imagemPublicaSegura = (url) => {
    if (!url) return '';
    if (url.startsWith('data:image/')) return url;
    try {
        const imagem = new URL(url);
        return ['http:', 'https:'].includes(imagem.protocol) ? imagem.href : '';
    } catch (_) {
        return '';
    }
};

// Páginas públicas com URLs limpas. O detalhe é renderizado no servidor para SEO.
app.get('/cursos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cursos.html'));
});

app.get('/cursos/:id', async (req, res) => {
    try {
        const { data: curso, error } = await db
            .from('cursos')
            .select('id, nome, descricao, motivo_modelo, restricoes, foto_url, localizacao, status, usuarios ( nome )')
            .eq('id', req.params.id)
            .eq('status', 'ativo')
            .maybeSingle();

        if (error) throw error;
        if (!curso) return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));

        const template = fs.readFileSync(path.join(__dirname, 'public', 'curso.html'), 'utf8');
        const descricao = curso.descricao || 'Procedimento prático supervisionado no SENAC.';
        const imagem = imagemPublicaSegura(curso.foto_url) || '/assets/logo-connect-senac.png';
        const canonical = `${req.protocol}://${req.get('host')}/cursos/${encodeURIComponent(curso.id)}`;
        const html = template
            .replaceAll('{{COURSE_NAME}}', escaparHtml(curso.nome))
            .replaceAll('{{COURSE_DESCRIPTION}}', escaparHtml(descricao))
            .replaceAll('{{COURSE_LOCATION}}', escaparHtml(curso.localizacao || 'SENAC'))
            .replaceAll('{{COURSE_TEACHER}}', escaparHtml(curso.usuarios?.nome || 'Docente a definir'))
            .replaceAll('{{COURSE_REASON}}', escaparHtml(curso.motivo_modelo || 'Apoie a formação prática de novos profissionais.'))
            .replaceAll('{{COURSE_RESTRICTIONS}}', escaparHtml(curso.restricoes || 'Consulte os horários para orientações específicas.'))
            .replaceAll('{{COURSE_IMAGE}}', escaparHtml(imagem))
            .replaceAll('{{COURSE_ID}}', escaparHtml(curso.id))
            .replaceAll('{{CANONICAL_URL}}', escaparHtml(canonical));

        res.type('html').send(html);
    } catch (error) {
        console.error('Erro ao renderizar curso público:', error.message);
        res.status(500).send('Não foi possível carregar este curso.');
    }
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
app.use('/api/assistente', require('./backend/routes/assistenteRoutes'));



// A Vercel importa o app como uma Function. O listener é necessário apenas
// ao executar o projeto localmente com `npm start`.
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(`Acesse: http://localhost:${PORT}/api/status`);
    });
}

module.exports = app;
