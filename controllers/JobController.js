const Job = require('../models/Job');
const User = require('../models/User');
const Alert = require('../models/Alert');

class JobController {
    // Create new job
    static async createJob(req, res) {
        try {
            const jobData = req.body;
            jobData.postedBy = req.user.id;

            const job = await Job.create(jobData);

            // Alert all students about a new job post (simple broadcast - optimize later)
            try {
                const students = await User.find({ role: 'Student', isVerified: true }).select('_id').limit(2000);
                const alerts = students.map(s => ({ userId: s._id, type: 'jobPost', message: `New job posted: ${job.title}` }));
                if (alerts.length) await Alert.insertMany(alerts, { ordered: false });
            } catch (e) {
                console.warn('Alert broadcast failed:', e?.message || e);
            }

            res.status(201).json({
                success: true,
                message: 'Job posted successfully',
                data: { job }
            });
        } catch (error) {
            console.error('Create job error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create job',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get all jobs with filters
    static async getJobs(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                location,
                type,
                company,
                minSalary,
                maxSalary,
                tags
            } = req.query;

            const query = { isActive: true };

            // Add filters
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { company: { $regex: search, $options: 'i' } }
                ];
            }

            if (location) query.location = { $regex: location, $options: 'i' };
            if (type) query.type = type;
            if (company) query.company = { $regex: company, $options: 'i' };
            if (tags) query.tags = { $in: tags.split(',') };

            // Salary range filter
            if (minSalary || maxSalary) {
                query['salary.min'] = {};
                if (minSalary) query['salary.min'].$gte = parseInt(minSalary);
                if (maxSalary) query['salary.max'] = { $lte: parseInt(maxSalary) };
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
            console.error('Get jobs error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get jobs',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get job by ID
    static async getJobById(req, res) {
        try {
            const { id } = req.params;

            const job = await Job.findById(id)
                .populate('postedBy', 'name email')
                .populate('applicants.userId', 'name email profile');

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            // Increment views
            job.views += 1;
            await job.save();

            res.json({
                success: true,
                data: { job }
            });
        } catch (error) {
            console.error('Get job by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get job',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Apply for job
    static async applyForJob(req, res) {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const resume = req.files?.resume?.[0];
            const coverLetter = req.files?.coverLetter?.[0];

            // Check if user is verified
            if (!req.user.isVerified) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account needs to be verified by admin before you can apply for jobs'
                });
            }

            const job = await Job.findById(id);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            if (!job.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'This job is no longer active'
                });
            }

            // Check if already applied
            const alreadyApplied = job.applicants.find(
                applicant => applicant.userId.toString() === req.user.id
            );

            if (alreadyApplied) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already applied for this job'
                });
            }

            // Add application
            const application = {
                userId: req.user.id,
                status: 'applied',
                appliedAt: new Date(),
                notes
            };

            if (resume) application.resume = resume.filename;
            if (coverLetter) application.coverLetter = coverLetter.filename;

            job.applicants.push(application);
            await job.save();

            res.json({
                success: true,
                message: 'Application submitted successfully',
                data: { application }
            });
        } catch (error) {
            console.error('Apply for job error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to submit application',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get student's application status for a specific job
    static async getMyApplicationStatus(req, res) {
        try {
            const { id } = req.params; // job id
            const userId = req.user.id;

            const job = await Job.findById(id).select('title company applicants');
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            // Find user's application
            const application = job.applicants.find(
                applicant => applicant.userId.toString() === userId
            );

            if (!application) {
                return res.status(404).json({
                    success: false,
                    message: 'You have not applied for this job'
                });
            }

            res.json({
                success: true,
                data: {
                    job: {
                        title: job.title,
                        company: job.company
                    },
                    application: {
                        status: application.status,
                        appliedAt: application.appliedAt,
                        resume: application.resume,
                        coverLetter: application.coverLetter,
                        notes: application.notes
                    }
                }
            });
        } catch (error) {
            console.error('Get application status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get application status',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get all applications for a student with detailed status
    static async getMyApplications(req, res) {
        try {
            const { page = 1, limit = 10, status } = req.query;
            const userId = req.user.id;

            // Find jobs where user has applied
            const jobs = await Job.find({
                'applicants.userId': userId
            }).populate('postedBy', 'name profile.company');

            // Filter by status if provided
            let filteredJobs = jobs;
            if (status) {
                filteredJobs = jobs.filter(job => {
                    const application = job.applicants.find(
                        app => app.userId.toString() === userId
                    );
                    return application && application.status === status;
                });
            }

            // Paginate results
            const total = filteredJobs.length;
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

            // Format response with application details
            const applications = paginatedJobs.map(job => {
                const application = job.applicants.find(
                    app => app.userId.toString() === userId
                );
                return {
                    jobId: job._id,
                    jobTitle: job.title,
                    company: job.postedBy.profile?.company || 'Unknown Company',
                    recruiter: job.postedBy.name,
                    status: application.status,
                    appliedAt: application.appliedAt,
                    resume: application.resume,
                    coverLetter: application.coverLetter,
                    notes: application.notes,
                    jobDeadline: job.deadline,
                    isJobActive: job.isActive
                };
            });

            res.json({
                success: true,
                data: {
                    applications,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalApplications: total
                    }
                }
            });
        } catch (error) {
            console.error('Get my applications error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get applications',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get recruiter's job postings
    static async getMyPostings(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;

            const jobs = await Job.find({ postedBy: req.user.id })
                .populate('applicants.userId', 'name email')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ createdAt: -1 });

            const total = await Job.countDocuments({ postedBy: req.user.id });

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
            console.error('Get my postings error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get job postings',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update applicant status (Recruiter only)
    static async updateApplicantStatus(req, res) {
        try {
            const { jobId, applicantId } = req.params;
            const { status } = req.body;

            const job = await Job.findById(jobId);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            // Check if user is the job poster
            if (job.postedBy.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this application'
                });
            }

            const applicant = job.applicants.id(applicantId);
            if (!applicant) {
                return res.status(404).json({
                    success: false,
                    message: 'Application not found'
                });
            }

            applicant.status = status;
            await job.save();

            res.json({
                success: true,
                message: 'Application status updated successfully',
                data: { application: applicant }
            });
        } catch (error) {
            console.error('Update applicant status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update application status',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update job
    static async updateJob(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const job = await Job.findById(id);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            // Check if user is the job poster
            if (job.postedBy.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this job'
                });
            }

            const updatedJob = await Job.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate('postedBy', 'name email');

            res.json({
                success: true,
                message: 'Job updated successfully',
                data: { job: updatedJob }
            });
        } catch (error) {
            console.error('Update job error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update job',
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

            // Check if user is the job poster
            if (job.postedBy.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this job'
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

    // Toggle job active status (Admin only)
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

    // Update job details (Admin only)
    static async updateJobAdmin(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Remove sensitive fields that admin shouldn't modify
            delete updateData.postedBy;
            delete updateData.applicants;
            delete updateData.views;
            delete updateData.applications;

            const job = await Job.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            res.json({
                success: true,
                message: 'Job updated successfully',
                data: { job }
            });
        } catch (error) {
            console.error('Update job admin error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update job',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get recruiter dashboard statistics
    static async getRecruiterStats(req, res) {
        try {
            const recruiterId = req.user.id;

            // Get job statistics
            const [
                totalJobs,
                activeJobs,
                expiredJobs,
                totalApplications,
                pendingApplications,
                shortlistedApplications,
                rejectedApplications,
                recentJobs,
                recentApplications
            ] = await Promise.all([
                Job.countDocuments({ postedBy: recruiterId }),
                Job.countDocuments({
                    postedBy: recruiterId,
                    isActive: true,
                    deadline: { $gt: new Date() }
                }),
                Job.countDocuments({
                    postedBy: recruiterId,
                    deadline: { $lt: new Date() }
                }),
                Job.aggregate([
                    { $match: { postedBy: recruiterId } },
                    { $unwind: '$applications' },
                    { $count: 'total' }
                ]).then(result => result[0]?.total || 0),
                Job.aggregate([
                    { $match: { postedBy: recruiterId } },
                    { $unwind: '$applications' },
                    { $match: { 'applications.status': 'pending' } },
                    { $count: 'total' }
                ]).then(result => result[0]?.total || 0),
                Job.aggregate([
                    { $match: { postedBy: recruiterId } },
                    { $unwind: '$applications' },
                    { $match: { 'applications.status': 'shortlisted' } },
                    { $count: 'total' }
                ]).then(result => result[0]?.total || 0),
                Job.aggregate([
                    { $match: { postedBy: recruiterId } },
                    { $unwind: '$applications' },
                    { $match: { 'applications.status': 'rejected' } },
                    { $count: 'total' }
                ]).then(result => result[0]?.total || 0),
                Job.find({ postedBy: recruiterId })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('title company isActive deadline applications'),
                Job.aggregate([
                    { $match: { postedBy: recruiterId } },
                    { $unwind: '$applications' },
                    { $sort: { 'applications.appliedAt': -1 } },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'applications.studentId',
                            foreignField: '_id',
                            as: 'student'
                        }
                    },
                    { $unwind: '$student' },
                    {
                        $project: {
                            jobTitle: '$title',
                            studentName: '$student.name',
                            studentEmail: '$student.email',
                            status: '$applications.status',
                            appliedAt: '$applications.appliedAt'
                        }
                    }
                ])
            ]);

            res.json({
                success: true,
                data: {
                    stats: {
                        jobs: {
                            total: totalJobs,
                            active: activeJobs,
                            expired: expiredJobs
                        },
                        applications: {
                            total: totalApplications,
                            pending: pendingApplications,
                            shortlisted: shortlistedApplications,
                            rejected: rejectedApplications
                        }
                    },
                    recentJobs,
                    recentApplications
                }
            });
        } catch (error) {
            console.error('Get recruiter stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get recruiter statistics',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = JobController;
