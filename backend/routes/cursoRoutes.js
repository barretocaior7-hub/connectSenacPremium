// backend/routes/cursoRoutes.js
const express = require('express');
const router = express.Router();
const cursoController = require('../controllers/cursoController');
const authMiddleware = require('../middlewares/authMiddleware');
const autorizarPerfis = require('../middlewares/rbacMiddleware');

// Rotas públicas da vitrine: visitantes não autenticados podem consultar.
router.get('/ativos', cursoController.listarAtivos);

// Nova Rota Restrita (Gestão Completa)
router.get('/admin', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.listarTodosAdmin);

router.get('/:id', cursoController.buscarAtivoPorId);

// Rotas de Criação, Edição, Arquivamento e Exclusão
router.post('/', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.criar);
router.put('/:id', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.atualizar);
router.put('/:id/arquivar', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.arquivar);
router.put('/:id/desarquivar', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.desarquivar);
router.delete('/:id/arquivar', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.arquivar);
router.delete('/:id', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.excluir);
router.delete('/:id/permanente', authMiddleware, autorizarPerfis('admin', 'coordenador'), cursoController.excluir);

module.exports = router;
