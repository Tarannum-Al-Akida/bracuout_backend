const express = require('express');
const router = express.Router();
const AlertController = require('../controllers/AlertController');
const { jwtVerify } = require('../middleware/auth');

router.post('/create', jwtVerify, AlertController.createAlert);
router.get('/', jwtVerify, AlertController.getUserAlerts);
router.patch('/:id/mark-seen', jwtVerify, AlertController.markAlertAsSeen);

module.exports = router;



