// backend/routes/feedbackRoutes.js
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apenas utilizadores autenticados podem enviar feedbacks
router.post('/', authMiddleware, feedbackController.criar);

// Para ver as avaliações no Pop-up (Aberto a todos os logados)
router.get('/curso/:cursoId', authMiddleware, feedbackController.listarPorCurso);

// Para ver o próprio histórico
router.get('/meus', authMiddleware, feedbackController.meusFeedbacks);

module.exports = router;