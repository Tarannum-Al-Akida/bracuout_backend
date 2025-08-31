const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/MessageController');
const { jwtVerify } = require('../middleware/auth');

router.post('/send', jwtVerify, MessageController.sendMessage);
router.get('/inbox', jwtVerify, MessageController.getMessagesForUser);
router.get('/conversation/:id', jwtVerify, MessageController.getConversationBetweenUsers);

module.exports = router;



