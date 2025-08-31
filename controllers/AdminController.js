const User = require('../models/User');
const Job = require('../models/Job');
const Referral = require('../models/Referral');
const SpamReport = require('../models/SpamReport');

class AdminController {
    // Get admin dashboard statistics
    static async getDashboardStats(req, res) {
        try {
            const [
                totalUsers,
                totalJobs,
                totalReferrals,
                pendingVerifications,
                highSpamUsers,
                activeJobs,
                recentUsers,
                recentJobs,
                recentReferrals
            ] = await Promise.all([
                User.countDocuments(),
                Job.countDocuments(),
                Referral.countDocuments(),
                User.countDocuments({
                    role: 'Alumni',
                    'alumniVerification.idCardUploaded': true,
                    'alumniVerification.idCardVerified': false
                }),
                User.countDocuments({ spamScore: { $gte: 5 } }),
                Job.countDocuments({ isActive: true }),
                User.find().sort({ createdAt: -1 }).limit(5).select('name email role isVerified'),
                Job.find().sort({ createdAt: -1 }).limit(5).select('title company isActive'),
                Referral.find().sort({ createdAt: -1 }).limit(5).populate('studentId', 'name').populate('alumniId', 'name')
            ]);

            res.json({
                success: true,
                data: {
                    stats: {
                        totalUsers,
                        totalJobs,
                        totalReferrals,
                        pendingVerifications,
                        highSpamUsers,
                        activeJobs
                    },
                    recentUsers,
                    recentJobs,
                    recentReferrals
                }
            });
        } catch (error) {
            console.error('Get dashboard stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get dashboard statistics',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get pending alumni verifications
    static async getPendingAlumniVerifications(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;

            // Show only unverified alumni for admin review
            const query = {
                role: 'Alumni',
                isVerified: false
            };

            const alumni = await User.find(query)
                .select('-password')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ createdAt: -1 });

            const total = await User.countDocuments(query);

            res.json({
                success: true,
                data: {
                    alumni,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalAlumni: total
                    }
                }
            });
        } catch (error) {
            console.error('Get pending alumni verifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get pending alumni verifications',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Verify alumni account
    static async verifyAlumniAccount(req, res) {
        try {
            const { alumniId } = req.params;
            const { isApproved, verificationNotes } = req.body;

            const alumni = await User.findById(alumniId);
            if (!alumni) {
                return res.status(404).json({
                    success: false,
                    message: 'Alumni not found'
                });
            }

            if (alumni.role !== 'Alumni') {
                return res.status(400).json({
                    success: false,
                    message: 'User is not an alumni'
                });
            }

            if (isApproved) {
                // Approve alumni account
                alumni.isVerified = true;
                alumni.alumniVerification.idCardVerified = true;
                alumni.alumniVerification.verifiedBy = req.user.id;
                alumni.alumniVerification.verifiedAt = new Date();
                alumni.alumniVerification.verificationNotes = verificationNotes || 'Approved by admin';

                await alumni.save();

                res.json({
                    success: true,
                    message: 'Alumni account verified successfully',
                    data: { alumni }
                });
            } else {
                // Reject alumni account
                alumni.alumniVerification.verificationNotes = verificationNotes || 'Rejected by admin';
                alumni.alumniVerification.verifiedBy = req.user.id;
                alumni.alumniVerification.verifiedAt = new Date();

                await alumni.save();

                res.json({
                    success: true,
                    message: 'Alumni account verification rejected',
                    data: { alumni }
                });
            }
        } catch (error) {
            console.error('Verify alumni account error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify alumni account',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get pending student verifications
    static async getPendingStudentVerifications(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;

            // Show only unverified students for admin review
            const query = {
                role: 'Student',
                isVerified: false
            };

            const students = await User.find(query)
                .select('-password')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ createdAt: -1 });

            const total = await User.countDocuments(query);

            res.json({
                success: true,
                data: {
                    students,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalStudents: total
                    }
                }
            });
        } catch (error) {
            console.error('Get pending student verifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get pending student verifications',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Verify student account
    static async verifyStudentAccount(req, res) {
        try {
            const { studentId } = req.params;
            const { isApproved, verificationNotes } = req.body;

            const student = await User.findById(studentId);
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }

            if (student.role !== 'Student') {
                return res.status(400).json({
                    success: false,
                    message: 'User is not a student'
                });
            }

            // Initialize verification fields if they don't exist
            if (!student.studentVerification) {
                student.studentVerification = {
                    studentIdCardUploaded: true,
                    studentIdCardVerified: false,
                    verifiedBy: null,
                    verifiedAt: null,
                    verificationNotes: ''
                };
            }

            if (isApproved) {
                // Approve student account
                student.isVerified = true;
                student.studentVerification.studentIdCardVerified = true;
                student.studentVerification.verifiedBy = req.user.id;
                student.studentVerification.verifiedAt = new Date();
                student.studentVerification.verificationNotes = verificationNotes || 'Approved by admin';

                await student.save();

                res.json({
                    success: true,
                    message: 'Student account verified successfully',
                    data: { student }
                });
            } else {
                // Reject student account
                student.studentVerification.verificationNotes = verificationNotes || 'Rejected by admin';
                student.studentVerification.verifiedBy = req.user.id;
                student.studentVerification.verifiedAt = new Date();

                await student.save();

                res.json({
                    success: true,
                    message: 'Student account verification rejected',
                    data: { student }
                });
            }
        } catch (error) {
            console.error('Verify student account error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify student account',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get pending recruiter verifications
    static async getPendingRecruiterVerifications(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;

            // Show only unverified recruiters for admin review
            const query = {
                role: 'Recruiter',
                isVerified: false
            };

            const recruiters = await User.find(query)
                .select('-password')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ createdAt: -1 });

            const total = await User.countDocuments(query);

            res.json({
                success: true,
                data: {
                    recruiters,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalRecruiters: total
                    }
                }
            });
        } catch (error) {
            console.error('Get pending recruiter verifications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get pending recruiter verifications',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Verify recruiter account
    static async verifyRecruiterAccount(req, res) {
        try {
            const { recruiterId } = req.params;
            const { isApproved, verificationNotes } = req.body;

            const recruiter = await User.findById(recruiterId);
            if (!recruiter) {
                return res.status(404).json({
                    success: false,
                    message: 'Recruiter not found'
                });
            }

            if (recruiter.role !== 'Recruiter') {
                return res.status(400).json({
                    success: false,
                    message: 'User is not a recruiter'
                });
            }

            if (isApproved) {
                // Approve recruiter account
                recruiter.isVerified = true;
                recruiter.recruiterVerification.companyDocumentVerified = true;
                recruiter.recruiterVerification.verifiedBy = req.user.id;
                recruiter.recruiterVerification.verifiedAt = new Date();
                recruiter.recruiterVerification.verificationNotes = verificationNotes || 'Approved by admin';

                await recruiter.save();

                res.json({
                    success: true,
                    message: 'Recruiter account verified successfully',
                    data: { recruiter }
                });
            } else {
                // Reject recruiter account
                recruiter.recruiterVerification.verificationNotes = verificationNotes || 'Rejected by admin';
                recruiter.recruiterVerification.verifiedBy = req.user.id;
                recruiter.recruiterVerification.verifiedAt = new Date();

                await recruiter.save();

                res.json({
                    success: true,
                    message: 'Recruiter account verification rejected',
                    data: { recruiter }
                });
            }
        } catch (error) {
            console.error('Verify recruiter account error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify recruiter account',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get all users with filters
    static async getAllUsers(req, res) {
        try {
            const { page = 1, limit = 10, role, isVerified, search, spamScore } = req.query;

            const query = {};
            if (role) query.role = role;
            if (isVerified !== undefined) query.isVerified = isVerified === 'true';
            if (spamScore) query.spamScore = { $gte: parseInt(spamScore) };
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }

            const users = await User.find(query)
                .select('-password')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ createdAt: -1 });

            const total = await User.countDocuments(query);

            res.json({
                success: true,
                data: {
                    users,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalUsers: total
                    }
                }
            });
        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get users',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get spam monitor data
    static async getSpamMonitor(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;

            const users = await User.find({ spamScore: { $gte: 3 } })
                .select('-password')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ spamScore: -1, createdAt: -1 });

            const total = await User.countDocuments({ spamScore: { $gte: 3 } });

            res.json({
                success: true,
                data: {
                    users,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalUsers: total
                    }
                }
            });
        } catch (error) {
            console.error('Get spam monitor error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get spam monitor data',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Block/Unblock user
    static async toggleUserBlock(req, res) {
        try {
            const { id } = req.params;
            const { isBlocked, reason } = req.body;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            user.isBlocked = isBlocked;

            // Update spam score based on action
            if (isBlocked) {
                user.spamScore = Math.min(user.spamScore + 2, 10);
            } else {
                user.spamScore = Math.max(user.spamScore - 1, 0);
            }

            await user.save();

            res.json({
                success: true,
                message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
                data: { user }
            });
        } catch (error) {
            console.error('Toggle user block error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user status',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update spam score manually
    static async updateSpamScore(req, res) {
        try {
            const { id } = req.params;
            const { spamScore, reason } = req.body;

            if (spamScore < 0 || spamScore > 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Spam score must be between 0 and 10'
                });
            }

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            user.spamScore = spamScore;
            await user.save();

            res.json({
                success: true,
                message: 'Spam score updated successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Update spam score error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update spam score',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get all jobs with filters
    static async getAllJobs(req, res) {
        try {
            const { page = 1, limit = 10, isActive, company, search } = req.query;

            const query = {};
            if (isActive !== undefined) query.isActive = isActive === 'true';
            if (company) query.company = { $regex: company, $options: 'i' };
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            const jobs = await Job.find(query)
                .populate('postedBy', 'name email')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ createdAt: -1 });

            const total = await Job.countDocuments(query);

            res.json({
                success: true,
                data: {
                    jobs,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalJobs: total
                    }
                }
            });
        } catch (error) {
            console.error('Get all jobs error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get jobs',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Toggle job status
    static async toggleJobStatus(req, res) {
        try {
            const { id } = req.params;

            const job = await Job.findById(id);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            job.isActive = !job.isActive;
            await job.save();

            res.json({
                success: true,
                message: `Job ${job.isActive ? 'activated' : 'deactivated'} successfully`,
                data: { job }
            });
        } catch (error) {
            console.error('Toggle job status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update job status',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Delete job
    static async deleteJob(req, res) {
        try {
            const { id } = req.params;

            const job = await Job.findById(id);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            await Job.findByIdAndDelete(id);

            res.json({
                success: true,
                message: 'Job deleted successfully'
            });
        } catch (error) {
            console.error('Delete job error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete job',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get all referrals with filters
    static async getAllReferrals(req, res) {
        try {
            const { page = 1, limit = 10, status, search } = req.query;

            const query = {};
            if (status) query.status = status;
            if (search) {
                query.$or = [
                    { 'studentId.name': { $regex: search, $options: 'i' } },
                    { 'alumniId.name': { $regex: search, $options: 'i' } }
                ];
            }

            const referrals = await Referral.find(query)
                .populate('studentId', 'name email')
                .populate('alumniId', 'name email')
                .populate('jobId', 'title company')
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
            console.error('Get all referrals error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get referrals',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Delete referral
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

    // Spam detection logic
    static async detectSpam(text, userId) {
        try {
            const spamPatterns = [
                /\b(?:buy|sell|earn|money|cash|profit|investment|bitcoin|crypto)\b/i,
                /\b(?:click here|visit now|limited time|act now|urgent)\b/i,
                /\b(?:free|discount|offer|deal|sale|promotion)\b/i,
                /\b(?:winner|congratulations|prize|lottery|jackpot)\b/i,
                /\b(?:loan|credit|debt|mortgage|refinance)\b/i,
                /\b(?:weight loss|diet|supplement|vitamin|health)\b/i,
                /\b(?:dating|single|meet|relationship|romance)\b/i,
                /\b(?:work from home|remote|online|part-time|flexible)\b/i
            ];

            const suspiciousLinks = [
                /bit\.ly|tinyurl|goo\.gl|t\.co|is\.gd|v\.gd|ow\.ly/i,
                /(?:http|https):\/\/[^\s]+/g
            ];

            let spamScore = 0;
            const detectedPatterns = [];

            // Check for spam patterns
            spamPatterns.forEach((pattern, index) => {
                const matches = text.match(pattern);
                if (matches) {
                    spamScore += matches.length;
                    detectedPatterns.push(`Pattern ${index + 1}: ${matches.join(', ')}`);
                }
            });

            // Check for suspicious links
            suspiciousLinks.forEach(pattern => {
                const matches = text.match(pattern);
                if (matches) {
                    spamScore += matches.length * 2;
                    detectedPatterns.push(`Suspicious links: ${matches.length}`);
                }
            });

            // Check for excessive repetition
            const words = text.toLowerCase().split(/\s+/);
            const wordCount = {};
            words.forEach(word => {
                wordCount[word] = (wordCount[word] || 0) + 1;
            });

            Object.values(wordCount).forEach(count => {
                if (count > 3) {
                    spamScore += count - 3;
                    detectedPatterns.push(`Word repetition: ${count} times`);
                }
            });

            // Check for all caps
            const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
            if (capsRatio > 0.7) {
                spamScore += 2;
                detectedPatterns.push('Excessive caps');
            }

            // Update user's spam score if significant
            if (spamScore > 0) {
                const user = await User.findById(userId);
                if (user) {
                    user.spamScore = Math.min(user.spamScore + spamScore, 10);
                    await user.save();
                }
            }

            return {
                isSpam: spamScore >= 5,
                spamScore,
                detectedPatterns,
                threshold: 5
            };
        } catch (error) {
            console.error('Spam detection error:', error);
            return {
                isSpam: false,
                spamScore: 0,
                detectedPatterns: [],
                threshold: 5
            };
        }
    }

    // Enhanced spam detection for user profiles
    static async detectSpamUser(user) {
        try {
            const links = user.links || [];
            const messages = user.messages || [];

            // Count suspicious links (excluding verified domains)
            const verifiedDomains = ['linkedin.com', 'github.com', 'bracu.ac.bd', 'verified-domain.com'];
            const linkCount = links.filter(link => {
                try {
                    const domain = new URL(link).hostname.toLowerCase();
                    return !verifiedDomains.some(verified => domain.includes(verified));
                } catch {
                    return true; // Invalid URLs are considered suspicious
                }
            }).length;

            // Detect repetitive messages
            const repetitiveMessages = messages.filter((msg, i, arr) =>
                arr.indexOf(msg) !== i
            );

            // Calculate spam score
            let spamScore = 0;
            const detectedPatterns = [];

            if (linkCount > 4) {
                spamScore += linkCount - 4;
                detectedPatterns.push(`Suspicious links: ${linkCount} detected`);
            }

            if (repetitiveMessages.length > 0) {
                spamScore += repetitiveMessages.length * 2;
                detectedPatterns.push(`Repetitive messages: ${repetitiveMessages.length} detected`);
            }

            // Check profile completeness and consistency
            if (user.profile) {
                if (user.profile.linkedin && !user.profile.linkedin.includes('linkedin.com')) {
                    spamScore += 2;
                    detectedPatterns.push('Suspicious LinkedIn URL');
                }

                if (user.profile.github && !user.profile.github.includes('github.com')) {
                    spamScore += 2;
                    detectedPatterns.push('Suspicious GitHub URL');
                }
            }

            // Update user's spam score
            if (spamScore > 0) {
                user.spamScore = Math.min(user.spamScore + spamScore, 100);
                user.isBlocked = user.spamScore >= 50; // Auto-block high spam users
                await user.save();
            }

            return {
                isSpam: spamScore >= 10,
                spamScore,
                detectedPatterns,
                linkCount,
                repetitiveMessageCount: repetitiveMessages.length,
                threshold: 10
            };
        } catch (error) {
            console.error('User spam detection error:', error);
            return {
                isSpam: false,
                spamScore: 0,
                detectedPatterns: [],
                linkCount: 0,
                repetitiveMessageCount: 0,
                threshold: 10
            };
        }
    }

    // Get users with spam detection
    static async getUsersWithSpamDetection(req, res) {
        try {
            const { page = 1, limit = 10, role, spamThreshold } = req.query;

            const query = {};
            if (role) query.role = role;
            if (spamThreshold) query.spamScore = { $gte: parseInt(spamThreshold) };

            const users = await User.find(query)
                .select('-password')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ spamScore: -1, createdAt: -1 });

            // Run spam detection on each user
            const usersWithSpamDetection = await Promise.all(
                users.map(async (user) => {
                    const spamResult = await AdminController.detectSpamUser(user);
                    return {
                        ...user.toObject(),
                        spamDetection: spamResult
                    };
                })
            );

            const total = await User.countDocuments(query);

            res.json({
                success: true,
                data: {
                    users: usersWithSpamDetection,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalUsers: total
                    }
                }
            });
        } catch (error) {
            console.error('Get users with spam detection error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get users with spam detection',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get spam reports
    static async getSpamReports(req, res) {
        try {
            const { page = 1, limit = 10, status } = req.query;

            const query = {};
            if (status) query.status = status;

            const reports = await SpamReport.find(query)
                .populate('reporter', 'name email role')
                .populate('reportedUser', 'name email role spamScore')
                .populate('resolvedBy', 'name email')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ createdAt: -1 });

            const total = await SpamReport.countDocuments(query);

            res.json({
                success: true,
                data: {
                    reports,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalReports: total
                    }
                }
            });
        } catch (error) {
            console.error('Get spam reports error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get spam reports',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Resolve spam report
    static async resolveSpamReport(req, res) {
        try {
            const { id } = req.params;
            const { action, notes } = req.body;

            const report = await SpamReport.findById(id);
            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: 'Spam report not found'
                });
            }

            if (action === 'resolve') {
                await report.resolve(req.user.id, notes);
            } else if (action === 'dismiss') {
                await report.dismiss(req.user.id, notes);
            }

            res.json({
                success: true,
                message: `Spam report ${action}d successfully`,
                data: { report }
            });
        } catch (error) {
            console.error('Resolve spam report error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to resolve spam report',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = AdminController;
