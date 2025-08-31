const express = require('express');
const router = express.Router();
const ConnectionController = require('../controllers/ConnectionController');
const { jwtVerify } = require('../middleware/auth');

router.post('/request', jwtVerify, ConnectionController.requestConnection);
router.patch('/:id/approve', jwtVerify, ConnectionController.approveConnection);
router.get('/', jwtVerify, ConnectionController.listConnections);
router.get('/incoming', jwtVerify, ConnectionController.listIncoming);
router.get('/outgoing', jwtVerify, ConnectionController.listOutgoing);
router.get('/status', jwtVerify, ConnectionController.status);

module.exports = router;


