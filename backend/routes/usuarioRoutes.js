// backend/routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/authMiddleware');

// Definindo os Endpoints Públicos
router.post('/registrar', usuarioController.registrar);
router.post('/login', usuarioController.login);
router.post('/auth/google', usuarioController.authGoogle);

// Rotas públicas de recuperação de senha
router.post('/esqueci-senha', usuarioController.solicitarRecuperacao);
router.post('/redefinir-senha', usuarioController.redefinirSenha);

// Rotas autenticadas de gestão de conta e segurança
router.get('/perfil', authMiddleware, usuarioController.obterPerfil);
router.put('/perfil', authMiddleware, usuarioController.atualizarPerfil);
router.put('/alterar-senha', authMiddleware, usuarioController.alterarSenha);

module.exports = router;