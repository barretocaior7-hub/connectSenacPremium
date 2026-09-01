// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

const authMiddleware = require('../middlewares/authMiddleware');
const autorizarPerfis = require('../middlewares/rbacMiddleware');

// 1. Ambos (Admin e Coordenador) podem ver a lista de usuários e estatísticas
router.get('/usuarios', authMiddleware, autorizarPerfis('admin', 'coordenador'), adminController.listarUsuarios || adminController.listarUsuários);

// 2. Admin e Coordenador podem bloquear/desbloquear (com proteção contra ações sobre Admin no controller)
router.put('/usuarios/:id/bloquear', authMiddleware, autorizarPerfis('admin', 'coordenador'), adminController.alterarStatusBloqueio);

// 3. Admin e Coordenador podem criar colaboradores (com proteção contra criação de Admin no controller)
router.post('/colaboradores', authMiddleware, autorizarPerfis('admin', 'coordenador'), adminController.criarColaborador);

router.get('/profissionais', authMiddleware, autorizarPerfis('admin', 'coordenador'), adminController.listarProfissionais);

// 4. Excluir usuário (Coordenador só pode excluir candidatos/professores, nunca Admin)
router.delete('/usuarios/:id', authMiddleware, autorizarPerfis('admin', 'coordenador'), adminController.excluirUsuario);

// 5. Alterar cargo (Coordenador não pode alterar nem conceder cargo de Admin)
router.put('/usuarios/:id/perfil', authMiddleware, autorizarPerfis('admin', 'coordenador'), adminController.alterarPerfil);

// 6. Pautas Globais de todas as turmas e presenças
router.get('/pautas-globais', authMiddleware, autorizarPerfis('admin', 'coordenador'), adminController.listarPautasGlobais);

module.exports = router;
