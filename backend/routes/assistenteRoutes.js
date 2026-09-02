// backend/routes/assistenteRoutes.js
const express = require('express');
const router = express.Router();
const assistenteController = require('../controllers/assistenteController');

// Rota pública para conversar com o assistente Gemini 3.6 Flash
router.post('/chat', assistenteController.conversar);

module.exports = router;
