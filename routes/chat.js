const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// GET /api/chat - status & endpoint docs
router.get('/', chatController.getChatStatus);

// POST /api/chat - send prompt to Gemini & receive reply
router.post('/', chatController.sendMessage);

module.exports = router;
