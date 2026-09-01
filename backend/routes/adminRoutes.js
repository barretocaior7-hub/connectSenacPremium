// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

const authMiddleware = require('../middlewares/authMiddleware');
const autorizarPerfis = require('../middlewares/rbacMiddleware');

// 1. Ambos (Admin e Coordenador) podem ver a lista de usuários e estatísticas
router.get('/usuarios', authMiddleware, autorizarPerfis('admin', 'coordenador'), adminController.listarUsuários);

// 2. Apenas o ADMIN supremo pode bloquear usuários
router.put('/usuarios/:id/bloquear', authMiddleware, autorizarPerfis('admin'), adminController.alterarStatusBloqueio);

// 3. Apenas o ADMIN supremo pode criar outros colaboradores (Coordenador não tem este acesso)
router.post('/colaboradores', authMiddleware, autorizarPerfis('admin'), adminController.criarColaborador);

router.get('/profissionais', authMiddleware, autorizarPerfis('admin', 'coordenador'), adminController.listarProfissionais);

router.delete('/usuarios/:id', authMiddleware, autorizarPerfis('admin', 'coordenador'), adminController.excluirUsuario);

router.put('/usuarios/:id/perfil', authMiddleware, autorizarPerfis('admin'), adminController.alterarPerfil);

// 6. Pautas Globais de todas as turmas e presenças
router.get('/pautas-globais', authMiddleware, autorizarPerfis('admin', 'coordenador'), adminController.listarPautasGlobais);

module.exports = router;