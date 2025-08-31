const Referral = require('../models/Referral');
const Job = require('../models/Job');
const User = require('../models/User');

class ReferralController {
    // Request referral
    static async requestReferral(req, res) {
        try {
            const { jobId, alumniId, studentMessage } = req.body;
            const resume = req.files?.resume?.[0];
            const coverLetter = req.files?.coverLetter?.[0];

            // Validate job exists
            const job = await Job.findById(jobId);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            // Validate alumni exists and is verified
            const alumni = await User.findById(alumniId);
            if (!alumni || alumni.role !== 'Alumni' || !alumni.isVerified) {
                return res.status(404).json({
                    success: false,
                    message: 'Alumni not found or not verified'
                });
            }

            // Check if referral already exists
            const existingReferral = await Referral.findOne({
                jobId,
                studentId: req.user.id,
                alumniId
            });

            if (existingReferral) {
                return res.status(400).json({
                    success: false,
                    message: 'Referral request already exists'
                });
            }

            // Create referral request
            const referralData = {
                jobId,
                studentId: req.user.id,
                alumniId,
                studentMessage,
                status: 'pending'
            };

            if (resume) {
                referralData.resume = resume.filename;
            }
            if (coverLetter) {
                referralData.coverLetter = coverLetter.filename;
            }

            const referral = await Referral.create(referralData);

            // Populate references
            await referral.populate('jobId', 'title company');
            await referral.populate('studentId', 'name email');
            await referral.populate('alumniId', 'name email');

            res.status(201).json({
                success: true,
                message: 'Referral request sent successfully',
                data: { referral }
            });
        } catch (error) {
            console.error('Request referral error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to request referral',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get student's referral requests
    static async getMyRequests(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;

            const referrals = await Referral.find({ studentId: req.user.id })
                .populate('jobId', 'title company location')
                .populate('alumniId', 'name email profile')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ createdAt: -1 });

            const total = await Referral.countDocuments({ studentId: req.user.id });

            res.json({
                success: true,
                data: {
                    referrals,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalReferrals: total
                    }
                }
            });
        } catch (error) {
            console.error('Get my requests error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get referral requests',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get alumni's referral requests
    static async getAlumniReferrals(req, res) {
        try {
            const { page = 1, limit = 10, status } = req.query;

            const query = { alumniId: req.user.id };
            if (status) query.status = status;

            const referrals = await Referral.find(query)
                .populate('jobId', 'title company location')
                .populate('studentId', 'name email profile')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ createdAt: -1 });

            const total = await Referral.countDocuments(query);



            res.json({
                success: true,
                data: {
                    referrals,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalReferrals: total
                    }
                }
            });
        } catch (error) {
            console.error('Get alumni referrals error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get referral requests',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get pending referrals for alumni
    static async getPendingReferrals(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;

            const referrals = await Referral.find({
                alumniId: req.user.id,
                status: 'pending'
            })
                .populate('jobId', 'title company location')
                .populate('studentId', 'name email profile')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ createdAt: -1 });

            const total = await Referral.countDocuments({
                alumniId: req.user.id,
                status: 'pending'
            });

            res.json({
                success: true,
                data: {
                    referrals,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalReferrals: total
                    }
                }
            });
        } catch (error) {
            console.error('Get pending referrals error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get pending referrals',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Approve referral
    static async approveReferral(req, res) {
        try {
            const { id } = req.params;
            const { alumniResponse } = req.body;

            const referral = await Referral.findById(id);
            if (!referral) {
                return res.status(404).json({
                    success: false,
                    message: 'Referral not found'
                });
            }

            // Check if user is the alumni
            if (referral.alumniId.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to approve this referral'
                });
            }

            if (referral.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Referral is not pending'
                });
            }

            referral.status = 'approved';
            referral.alumniResponse = alumniResponse;
            await referral.save();

            // Populate references
            await referral.populate('jobId', 'title company');
            await referral.populate('studentId', 'name email');
            await referral.populate('alumniId', 'name email');

            res.json({
                success: true,
                message: 'Referral approved successfully',
                data: { referral }
            });
        } catch (error) {
            console.error('Approve referral error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to approve referral',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Reject referral
    static async rejectReferral(req, res) {
        try {
            const { id } = req.params;
            const { alumniResponse } = req.body;

            const referral = await Referral.findById(id);
            if (!referral) {
                return res.status(404).json({
                    success: false,
                    message: 'Referral not found'
                });
            }

            // Check if user is the alumni
            if (referral.alumniId.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to reject this referral'
                });
            }

            if (referral.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Referral is not pending'
                });
            }

            referral.status = 'rejected';
            referral.alumniResponse = alumniResponse;
            await referral.save();

            // Populate references
            await referral.populate('jobId', 'title company');
            await referral.populate('studentId', 'name email');
            await referral.populate('alumniId', 'name email');

            res.json({
                success: true,
                message: 'Referral rejected successfully',
                data: { referral }
            });
        } catch (error) {
            console.error('Reject referral error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reject referral',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Mark referral as read
    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const { readBy } = req.body; // 'student' or 'alumni'

            const referral = await Referral.findById(id);
            if (!referral) {
                return res.status(404).json({
                    success: false,
                    message: 'Referral not found'
                });
            }

            // Check authorization
            if (readBy === 'student' && referral.studentId.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to mark this referral as read'
                });
            }

            if (readBy === 'alumni' && referral.alumniId.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to mark this referral as read'
                });
            }

            // Update read status
            if (readBy === 'student') {
                referral.isReadByStudent = true;
            } else if (readBy === 'alumni') {
                referral.isReadByAlumni = true;
            }

            await referral.save();

            res.json({
                success: true,
                message: 'Referral marked as read',
                data: { referral }
            });
        } catch (error) {
            console.error('Mark as read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark referral as read',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get referral by ID
    static async getReferralById(req, res) {
        try {
            const { id } = req.params;

            const referral = await Referral.findById(id)
                .populate('jobId', 'title company location description')
                .populate('studentId', 'name email profile')
                .populate('alumniId', 'name email profile');

            if (!referral) {
                return res.status(404).json({
                    success: false,
                    message: 'Referral not found'
                });
            }

            // Check authorization
            if (referral.studentId._id.toString() !== req.user.id &&
                referral.alumniId._id.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this referral'
                });
            }

            res.json({
                success: true,
                data: { referral }
            });
        } catch (error) {
            console.error('Get referral by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get referral',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get referrals for a specific job
    static async getReferralsByJob(req, res) {
        try {
            const { jobId } = req.params;
            const { page = 1, limit = 10 } = req.query;

            const referrals = await Referral.find({ jobId })
                .populate('studentId', 'name email profile')
                .populate('alumniId', 'name email profile')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ createdAt: -1 });

            const total = await Referral.countDocuments({ jobId });

            res.json({
                success: true,
                data: {
                    referrals,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalReferrals: total
                    }
                }
            });
        } catch (error) {
            console.error('Get referrals by job error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get referrals',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Delete referral (Student only)
    static async deleteReferral(req, res) {
        try {
            const { id } = req.params;

            const referral = await Referral.findById(id);
            if (!referral) {
                return res.status(404).json({
                    success: false,
                    message: 'Referral not found'
                });
            }

            // Check if user is the student and referral is pending
            if (referral.studentId.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this referral'
                });
            }

            if (referral.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Only pending referrals can be deleted'
                });
            }

            await Referral.findByIdAndDelete(id);

            res.json({
                success: true,
                message: 'Referral deleted successfully'
            });
        } catch (error) {
            console.error('Delete referral error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete referral',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = ReferralController;
