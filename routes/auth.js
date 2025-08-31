const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { jwtVerify } = require('../middleware/auth');
const { uploadIdCard } = require('../middleware/fileUpload');
const { handleUploadError } = require('../middleware/fileUpload');

// Public routes
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Auth API is running',
        timestamp: new Date().toISOString()
    });
});

router.post('/register', uploadIdCard, handleUploadError, AuthController.register);
router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get('/verify-email', AuthController.verifyEmail); // Email verification endpoint

// Temporary admin creation endpoint (REMOVE IN PRODUCTION)
router.post('/create-admin', AuthController.createAdmin);

// Protected routes
router.get('/me', jwtVerify, AuthController.getCurrentUser);
router.post('/logout', jwtVerify, AuthController.logout);

module.exports = router;
