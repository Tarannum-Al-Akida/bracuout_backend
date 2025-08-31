const express = require('express');
const router = express.Router();
const ResumeController = require('../controllers/ResumeController');
const { jwtVerify } = require('../middleware/auth');

router.post('/generate', jwtVerify, ResumeController.generateResume);

module.exports = router;



