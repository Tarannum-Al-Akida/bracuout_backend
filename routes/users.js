const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { jwtVerify } = require('../middleware/auth');
const { roleProtect } = require('../middleware/roleProtect');
const { uploadProfilePhoto, uploadIdCard, handleUploadError } = require('../middleware/fileUpload');

// Public routes (if any)
// None for now

// Protected routes
router.get('/profile/:id', jwtVerify, UserController.getUserProfile);
router.put('/profile/:id', jwtVerify, uploadProfilePhoto, handleUploadError, UserController.updateUserProfile);
router.post('/:id/upload-verification', jwtVerify, uploadIdCard, handleUploadError, UserController.uploadVerificationDocuments);
router.get('/search', jwtVerify, UserController.searchUsers);

// Experience management routes
router.post('/:id/experience', jwtVerify, UserController.addExperience);
router.put('/:id/experience/:experienceId', jwtVerify, UserController.updateExperience);
router.delete('/:id/experience/:experienceId', jwtVerify, UserController.deleteExperience);

// Awards management routes
router.post('/:id/awards', jwtVerify, UserController.addAward);
router.put('/:id/awards/:awardId', jwtVerify, UserController.updateAward);
router.delete('/:id/awards/:awardId', jwtVerify, UserController.deleteAward);

// Student routes
router.get('/student/application-history', jwtVerify, roleProtect('Student'), UserController.getStudentApplicationHistory);

// Admin routes
router.get('/verify-requests', jwtVerify, roleProtect('Admin'), UserController.getVerificationRequests);
router.post('/verify/:id', jwtVerify, roleProtect('Admin'), UserController.verifyUser);
router.get('/alumni', jwtVerify, UserController.getUsersByRole);
router.get('/students', jwtVerify, UserController.getUsersByRole);
router.get('/recruiters', jwtVerify, UserController.getUsersByRole);
router.patch('/block/:id', jwtVerify, roleProtect('Admin'), UserController.toggleUserBlock);
router.delete('/:id', jwtVerify, roleProtect('Admin'), UserController.deleteUser);

module.exports = router;
