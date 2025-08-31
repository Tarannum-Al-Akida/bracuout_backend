const express = require('express');
const router = express.Router();
const ReferralController = require('../controllers/ReferralController');
const { jwtVerify } = require('../middleware/auth');
const { roleProtect } = require('../middleware/roleProtect');
const { upload, handleUploadError } = require('../middleware/fileUpload');
const { spamDetector, contentValidator } = require('../middleware/spamDetector');

// Protected routes
router.post('/request', jwtVerify, roleProtect('Student'), upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
]), handleUploadError, spamDetector, contentValidator, ReferralController.requestReferral);
router.get('/my-requests', jwtVerify, roleProtect('Student'), ReferralController.getMyRequests);
router.get('/alumni', jwtVerify, roleProtect('Alumni'), ReferralController.getAlumniReferrals);
router.get('/alumni/pending', jwtVerify, roleProtect('Alumni'), ReferralController.getPendingReferrals);
router.patch('/:id/approve', jwtVerify, roleProtect('Alumni'), spamDetector, contentValidator, ReferralController.approveReferral);
router.patch('/:id/reject', jwtVerify, roleProtect('Alumni'), spamDetector, contentValidator, ReferralController.rejectReferral);
router.patch('/:id/mark-read', jwtVerify, ReferralController.markAsRead);
router.get('/:id', jwtVerify, ReferralController.getReferralById);
router.get('/job/:jobId', jwtVerify, ReferralController.getReferralsByJob);
router.delete('/:id', jwtVerify, roleProtect('Student'), ReferralController.deleteReferral);

module.exports = router;
