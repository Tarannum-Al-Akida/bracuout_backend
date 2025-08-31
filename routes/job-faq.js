const express = require('express');
const router = express.Router();
const JobFAQController = require('../controllers/JobFAQController');
const { jwtVerify } = require('../middleware/auth');
const { roleProtect } = require('../middleware/roleProtect');

// Public routes (no authentication required)
router.get('/', JobFAQController.getAllFAQs);
router.get('/categories', JobFAQController.getCategories);
router.get('/:id', JobFAQController.getFAQById);

// Protected routes
router.post('/', jwtVerify, roleProtect('Recruiter'), JobFAQController.createFAQ);
router.put('/:id', jwtVerify, roleProtect('Recruiter'), JobFAQController.updateFAQ);
router.delete('/:id', jwtVerify, roleProtect('Recruiter'), JobFAQController.deleteFAQ);
router.post('/:id/helpful', jwtVerify, JobFAQController.markHelpful);
router.get('/recruiter/my-faqs', jwtVerify, roleProtect('Recruiter'), JobFAQController.getRecruiterFAQs);

module.exports = router;

