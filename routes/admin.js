const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const { jwtVerify } = require('../middleware/auth');
const { roleProtect } = require('../middleware/roleProtect');

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin)
router.get('/dashboard', jwtVerify, roleProtect('Admin'), AdminController.getDashboardStats);

// @route   GET /api/admin/users
// @desc    Get all users with filters (admin only)
// @access  Private (Admin)
router.get('/users', jwtVerify, roleProtect('Admin'), AdminController.getAllUsers);

// @route   GET /api/admin/alumni-verifications
// @desc    Get pending alumni verifications (admin only)
// @access  Private (Admin)
router.get('/alumni-verifications', jwtVerify, roleProtect('Admin'), AdminController.getPendingAlumniVerifications);

// @route   PATCH /api/admin/verify-alumni/:alumniId
// @desc    Verify or reject alumni account (admin only)
// @access  Private (Admin)
router.patch('/verify-alumni/:alumniId', jwtVerify, roleProtect('Admin'), AdminController.verifyAlumniAccount);

// @route   GET /api/admin/student-verifications
// @desc    Get pending student verifications (admin only)
// @access  Private (Admin)
router.get('/student-verifications', jwtVerify, roleProtect('Admin'), AdminController.getPendingStudentVerifications);

// @route   PATCH /api/admin/verify-student/:studentId
// @desc    Verify or reject student account (admin only)
// @access  Private (Admin)
router.patch('/verify-student/:studentId', jwtVerify, roleProtect('Admin'), AdminController.verifyStudentAccount);

// @route   GET /api/admin/recruiter-verifications
// @desc    Get pending recruiter verifications (admin only)
// @access  Private (Admin)
router.get('/recruiter-verifications', jwtVerify, roleProtect('Admin'), AdminController.getPendingRecruiterVerifications);

// @route   PATCH /api/admin/verify-recruiter/:recruiterId
// @desc    Verify or reject recruiter account (admin only)
// @access  Private (Admin)
router.patch('/verify-recruiter/:recruiterId', jwtVerify, roleProtect('Admin'), AdminController.verifyRecruiterAccount);

// @route   GET /api/admin/spam-monitor
// @desc    Get users with high spam scores (admin only)
// @access  Private (Admin)
router.get('/spam-monitor', jwtVerify, roleProtect('Admin'), AdminController.getSpamMonitor);

// @route   GET /api/admin/users/spam-detection
// @desc    Get users with enhanced spam detection (admin only)
// @access  Private (Admin)
router.get('/users/spam-detection', jwtVerify, roleProtect('Admin'), AdminController.getUsersWithSpamDetection);

// @route   PATCH /api/admin/block-user/:id
// @desc    Block/unblock user (admin only)
// @access  Private (Admin)
router.patch('/block-user/:id', jwtVerify, roleProtect('Admin'), AdminController.toggleUserBlock);

// @route   PATCH /api/admin/update-spam-score/:id
// @desc    Update user spam score (admin only)
// @access  Private (Admin)
router.patch('/update-spam-score/:id', jwtVerify, roleProtect('Admin'), AdminController.updateSpamScore);

// @route   GET /api/admin/jobs
// @desc    Get all jobs with filters (admin only)
// @access  Private (Admin)
router.get('/jobs', jwtVerify, roleProtect('Admin'), AdminController.getAllJobs);

// @route   PATCH /api/admin/toggle-job/:id
// @desc    Toggle job active status (admin only)
// @access  Private (Admin)
router.patch('/toggle-job/:id', jwtVerify, roleProtect('Admin'), AdminController.toggleJobStatus);

// @route   GET /api/admin/referrals
// @desc    Get all referrals with filters (admin only)
// @access  Private (Admin)
router.get('/referrals', jwtVerify, roleProtect('Admin'), AdminController.getAllReferrals);

// @route   DELETE /api/admin/delete-job/:id
// @desc    Delete job (admin only)
// @access  Private (Admin)
router.delete('/delete-job/:id', jwtVerify, roleProtect('Admin'), AdminController.deleteJob);

// @route   DELETE /api/admin/delete-referral/:id
// @desc    Delete referral (admin only)
// @access  Private (Admin)
router.delete('/delete-referral/:id', jwtVerify, roleProtect('Admin'), AdminController.deleteReferral);

module.exports = router;
