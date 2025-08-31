const express = require('express');
const router = express.Router();
const JobController = require('../controllers/JobController');
const { jwtVerify } = require('../middleware/auth');
const { roleProtect } = require('../middleware/roleProtect');
const { uploadResume, uploadCoverLetter, handleUploadError } = require('../middleware/fileUpload');
const { spamDetector, contentValidator } = require('../middleware/spamDetector');

// Public routes
router.get('/', JobController.getJobs);

// Protected routes - specific routes first
router.get('/my-postings', jwtVerify, roleProtect('Recruiter'), JobController.getMyPostings);
router.get('/my-applications', jwtVerify, roleProtect('Student'), JobController.getMyApplications);
router.get('/recruiter/summary', jwtVerify, roleProtect('Recruiter'), JobController.getRecruiterStats);

// Application status route
router.get('/:id/my-application', jwtVerify, roleProtect('Student'), JobController.getMyApplicationStatus);

// Parameterized routes after specific routes
router.get('/:id', JobController.getJobById);
router.post('/', jwtVerify, roleProtect('Recruiter'), spamDetector, contentValidator, JobController.createJob);
router.post('/:id/apply', jwtVerify, roleProtect('Student'), uploadResume, uploadCoverLetter, handleUploadError, JobController.applyForJob);
router.patch('/:jobId/applicant-status/:applicantId', jwtVerify, roleProtect('Recruiter'), JobController.updateApplicantStatus);
router.put('/:id', jwtVerify, roleProtect('Recruiter'), spamDetector, contentValidator, JobController.updateJob);
router.delete('/:id', jwtVerify, roleProtect('Recruiter'), JobController.deleteJob);

// Admin routes
router.patch('/:id/toggle', jwtVerify, roleProtect('Admin'), JobController.toggleJobStatus);
router.put('/:id/admin', jwtVerify, roleProtect('Admin'), JobController.updateJobAdmin);

module.exports = router;
