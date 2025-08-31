const express = require('express');
const router = express.Router();
const QASessionController = require('../controllers/QASessionController');
const { jwtVerify } = require('../middleware/auth');
const { roleProtect } = require('../middleware/roleProtect');

router.post('/create', jwtVerify, roleProtect('Recruiter'), QASessionController.createQASession);
router.get('/', jwtVerify, QASessionController.listSessions);
router.get('/:id', jwtVerify, QASessionController.getQASessionDetails);
router.patch('/:id/mark-completed', jwtVerify, roleProtect('Recruiter'), QASessionController.markQASessionCompleted);
router.get('/student/:id', jwtVerify, QASessionController.getStudentQAStatus);
router.post('/:id/answers', jwtVerify, roleProtect('Student'), QASessionController.submitAnswers);

// New routes for job-linked Q&A sessions
router.get('/job/:jobId', jwtVerify, QASessionController.getJobQASessions);
router.get('/recruiter/sessions', jwtVerify, roleProtect('Recruiter'), QASessionController.getRecruiterQASessions);

module.exports = router;


