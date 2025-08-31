const User = require('../models/User');
const Job = require('../models/Job');
const Referral = require('../models/Referral');

class UserController {
    // Get user profile
    static async getUserProfile(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findById(id).select('-password');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                data: { user }
            });
        } catch (error) {
            console.error('Get user profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user profile',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update user profile
    static async updateUserProfile(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const profilePhoto = req.file;
            
            console.log('Profile update request for user:', id);
            console.log('Update data received:', JSON.stringify(updateData, null, 2));

            // Check if user exists
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is updating their own profile or is admin
            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            // Handle profile fields properly
            if (updateData.profile) {
                // Merge profile data instead of replacing
                user.profile = {
                    ...user.profile,
                    ...updateData.profile
                };
            }

            // Handle direct profile field updates (for backward compatibility)
            if (updateData.department !== undefined) {
                if (!user.profile) user.profile = {};
                user.profile.department = updateData.department;
            }
            if (updateData.batch !== undefined) {
                if (!user.profile) user.profile = {};
                user.profile.batch = updateData.batch;
            }
            if (updateData.company !== undefined) {
                if (!user.profile) user.profile = {};
                user.profile.company = updateData.company;
            }
            if (updateData.jobTitle !== undefined) {
                if (!user.profile) user.profile = {};
                user.profile.jobTitle = updateData.jobTitle;
            }
            if (updateData.phone !== undefined) {
                if (!user.profile) user.profile = {};
                user.profile.phone = updateData.phone;
            }
            if (updateData.linkedin !== undefined) {
                if (!user.profile) user.profile = {};
                user.profile.linkedin = updateData.linkedin;
            }
            if (updateData.github !== undefined) {
                if (!user.profile) user.profile = {};
                user.profile.github = updateData.github;
            }
            if (updateData.experience !== undefined) {
                if (!user.profile) user.profile = {};
                user.profile.experience = updateData.experience;
                console.log('Updating experience:', updateData.experience);
            }
            if (updateData.skills !== undefined) {
                if (!user.profile) user.profile = {};
                user.profile.skills = updateData.skills;
                console.log('Updating skills:', updateData.skills);
            }
            if (updateData.awards !== undefined) {
                if (!user.profile) user.profile = {};
                user.profile.awards = updateData.awards;
                console.log('Updating awards:', updateData.awards);
            }
            if (updateData.languages !== undefined) {
                if (!user.profile) user.profile = {};
                user.profile.languages = updateData.languages;
            }
            if (updateData.interests !== undefined) {
                if (!user.profile) user.profile = {};
                user.profile.interests = updateData.interests;
            }

            // Update profile photo if provided
            if (profilePhoto) {
                if (!user.profile) user.profile = {};
                user.profile.photo = profilePhoto.filename;
            }

            // Update basic user fields
            if (updateData.name !== undefined) user.name = updateData.name;
            if (updateData.email !== undefined) user.email = updateData.email;

            // Save the user
            await user.save();
            console.log('User saved successfully');
            console.log('User after save - profile:', JSON.stringify(user.profile, null, 2));

            // Fetch updated user without password
            const updatedUser = await User.findById(id).select('-password');
            console.log('Updated user from database - profile:', JSON.stringify(updatedUser.profile, null, 2));

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: { user: updatedUser }
            });
        } catch (error) {
            console.error('Update user profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update profile',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Upload verification documents
    static async uploadVerificationDocuments(req, res) {
        try {
            const { id } = req.params;
            const { documentType } = req.body;
            const documentFile = req.file;

            // Check if user exists
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is uploading their own documents
            if (req.user.id !== id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to upload documents for this user'
                });
            }

            if (!documentFile) {
                return res.status(400).json({
                    success: false,
                    message: 'No document file provided'
                });
            }

            // Update verification status based on document type and user role
            if (documentType === 'studentIdCard' && user.role === 'Student') {
                user.studentVerification.studentIdCardUploaded = true;
                user.studentVerification.studentIdCardVerified = false; // Reset verification status
                user.profile.bracuIdCard = documentFile.filename;
            } else if (documentType === 'companyDocument' && user.role === 'Recruiter') {
                user.recruiterVerification.companyDocumentUploaded = true;
                user.recruiterVerification.companyDocumentVerified = false; // Reset verification status
                user.profile.companyDocument = documentFile.filename;
            } else if (documentType === 'alumniIdCard' && user.role === 'Alumni') {
                user.alumniVerification.idCardUploaded = true;
                user.alumniVerification.idCardVerified = false; // Reset verification status
                user.profile.bracuIdCard = documentFile.filename;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid document type for user role'
                });
            }

            await user.save();

            res.json({
                success: true,
                message: 'Verification document uploaded successfully',
                data: {
                    documentType,
                    filename: documentFile.filename,
                    verificationStatus: {
                        uploaded: true,
                        verified: false
                    }
                }
            });
        } catch (error) {
            console.error('Upload verification documents error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload verification document',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get verification requests (Admin only)
    static async getVerificationRequests(req, res) {
        try {
            const users = await User.find({
                role: 'Alumni',
                isVerified: false
            }).select('-password');

            res.json({
                success: true,
                data: { users }
            });
        } catch (error) {
            console.error('Get verification requests error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get verification requests',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Verify user (Admin only)
    static async verifyUser(req, res) {
        try {
            const { id } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (user.role !== 'Alumni') {
                return res.status(400).json({
                    success: false,
                    message: 'Only alumni can be verified'
                });
            }

            user.isVerified = true;
            await user.save();

            res.json({
                success: true,
                message: 'User verified successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Verify user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify user',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get users by role
    static async getUsersByRole(req, res) {
        try {
            // Determine role from the request path
            const pathSegments = req.path.split('/');
            const roleFromPath = pathSegments[pathSegments.length - 1]; // Gets 'alumni', 'students', or 'recruiters' from the path

            // Map the path segment to the actual role enum value
            let role;
            switch (roleFromPath) {
                case 'alumni':
                    role = 'Alumni';
                    break;
                case 'students':
                    role = 'Student';
                    break;
                case 'recruiters':
                    role = 'Recruiter';
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid role specified'
                    });
            }

            const { page = 1, limit = 10, search } = req.query;

            const query = { role, isVerified: true, isBlocked: false };
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
                        currentPage: page,
                        totalPages: Math.ceil(total / limit),
                        totalUsers: total
                    }
                }
            });
        } catch (error) {
            console.error('Get users by role error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get users',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Search users by name or email (simple global search)
    static async searchUsers(req, res) {
        try {
            const { q, limit = 10 } = req.query;
            if (!q || q.trim().length === 0) {
                return res.json({ success: true, data: { users: [] } });
            }

            const regex = new RegExp(q.trim(), 'i');
            const users = await User.find({
                isBlocked: false,
                $or: [
                    { name: regex },
                    { email: regex }
                ]
            })
                .select('name email role profile')
                .limit(Number(limit));

            res.json({ success: true, data: { users } });
        } catch (error) {
            console.error('Search users error:', error);
            res.status(500).json({ success: false, message: 'Failed to search users' });
        }
    }

    // Block/Unblock user (Admin only)
    static async toggleUserBlock(req, res) {
        try {
            const { id } = req.params;
            const { isBlocked } = req.body;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            user.isBlocked = isBlocked;
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

    // Delete user (Admin only)
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            await User.findByIdAndDelete(id);

            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete user',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get all users with filters (Admin only)
    static async getAllUsers(req, res) {
        try {
            const { page = 1, limit = 10, role, isVerified, search } = req.query;

            const query = {};
            if (role) query.role = role;
            if (isVerified !== undefined) query.isVerified = isVerified === 'true';
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

    // Get student application timeline
    static async getStudentApplicationHistory(req, res) {
        try {
            const studentId = req.user.id;

            // Get job applications
            const jobApplications = await Job.aggregate([
                { $unwind: '$applications' },
                { $match: { 'applications.studentId': studentId } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'postedBy',
                        foreignField: '_id',
                        as: 'recruiter'
                    }
                },
                { $unwind: '$recruiter' },
                {
                    $project: {
                        type: 'job',
                        jobTitle: '$title',
                        company: '$company',
                        status: '$applications.status',
                        appliedAt: '$applications.appliedAt',
                        recruiterName: '$recruiter.name',
                        recruiterEmail: '$recruiter.email'
                    }
                },
                { $sort: { appliedAt: -1 } }
            ]);

            // Get referral applications
            const referralApplications = await Referral.aggregate([
                { $match: { studentId: studentId } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'alumniId',
                        foreignField: '_id',
                        as: 'alumni'
                    }
                },
                { $unwind: '$alumni' },
                {
                    $lookup: {
                        from: 'jobs',
                        localField: 'jobId',
                        foreignField: '_id',
                        as: 'job'
                    }
                },
                { $unwind: '$job' },
                {
                    $project: {
                        type: 'referral',
                        jobTitle: '$job.title',
                        company: '$job.company',
                        status: '$status',
                        appliedAt: '$createdAt',
                        alumniName: '$alumni.name',
                        alumniEmail: '$alumni.email'
                    }
                },
                { $sort: { appliedAt: -1 } }
            ]);

            // Combine and sort all applications
            const allApplications = [...jobApplications, ...referralApplications]
                .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

            // Get statistics
            const stats = {
                totalApplications: allApplications.length,
                jobApplications: jobApplications.length,
                referralApplications: referralApplications.length,
                pending: allApplications.filter(app => app.status === 'pending').length,
                shortlisted: allApplications.filter(app => app.status === 'shortlisted').length,
                rejected: allApplications.filter(app => app.status === 'rejected').length,
                approved: allApplications.filter(app => app.status === 'approved').length
            };

            res.json({
                success: true,
                data: {
                    applications: allApplications,
                    stats
                }
            });
        } catch (error) {
            console.error('Get student application history error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get application history',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Add experience entry
    static async addExperience(req, res) {
        try {
            const { id } = req.params;
            const { title, company, duration, description } = req.body;

            // Check if user exists
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is updating their own profile or is admin
            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            // Add experience entry
            if (!user.profile.experience) {
                user.profile.experience = [];
            }
            user.profile.experience.push({ title, company, duration, description });
            await user.save();

            res.json({
                success: true,
                message: 'Experience added successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Add experience error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add experience',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update experience entry
    static async updateExperience(req, res) {
        try {
            const { id, experienceId } = req.params;
            const { title, company, duration, description } = req.body;

            // Check if user exists
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is updating their own profile or is admin
            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            // Find and update experience entry
            const experienceIndex = user.profile.experience.findIndex(exp => exp._id.toString() === experienceId);
            if (experienceIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Experience entry not found'
                });
            }

            user.profile.experience[experienceIndex] = { title, company, duration, description };
            await user.save();

            res.json({
                success: true,
                message: 'Experience updated successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Update experience error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update experience',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Delete experience entry
    static async deleteExperience(req, res) {
        try {
            const { id, experienceId } = req.params;

            // Check if user exists
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is updating their own profile or is admin
            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            // Remove experience entry
            user.profile.experience = user.profile.experience.filter(exp => exp._id.toString() !== experienceId);
            await user.save();

            res.json({
                success: true,
                message: 'Experience deleted successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Delete experience error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete experience',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Add skill
    static async addSkill(req, res) {
        try {
            const { id } = req.params;
            const { skill } = req.body;

            // Check if user exists
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is updating their own profile or is admin
            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            // Add skill
            if (!user.profile.skills) {
                user.profile.skills = [];
            }
            if (!user.profile.skills.includes(skill)) {
                user.profile.skills.push(skill);
            }
            await user.save();

            res.json({
                success: true,
                message: 'Skill added successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Add skill error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add skill',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Delete skill
    static async deleteSkill(req, res) {
        try {
            const { id, skill } = req.params;

            // Check if user exists
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is updating their own profile or is admin
            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            // Remove skill
            user.profile.skills = user.profile.skills.filter(s => s !== skill);
            await user.save();

            res.json({
                success: true,
                message: 'Skill deleted successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Delete skill error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete skill',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Add award
    static async addAward(req, res) {
        try {
            const { id } = req.params;
            const { title, organization, year, description } = req.body;

            // Check if user exists
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is updating their own profile or is admin
            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            // Add award
            if (!user.profile.awards) {
                user.profile.awards = [];
            }
            user.profile.awards.push({ title, organization, year, description });
            await user.save();

            res.json({
                success: true,
                message: 'Award added successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Add award error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add award',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update award
    static async updateAward(req, res) {
        try {
            const { id, awardId } = req.params;
            const { title, organization, year, description } = req.body;

            // Check if user exists
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is updating their own profile or is admin
            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            // Find and update award
            const awardIndex = user.profile.awards.findIndex(award => award._id.toString() === awardId);
            if (awardIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Award not found'
                });
            }

            user.profile.awards[awardIndex] = { title, organization, year, description };
            await user.save();

            res.json({
                success: true,
                message: 'Award updated successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Update award error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update award',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Delete award
    static async deleteAward(req, res) {
        try {
            const { id, awardId } = req.params;

            // Check if user exists
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is updating their own profile or is admin
            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            // Remove award
            user.profile.awards = user.profile.awards.filter(award => award._id.toString() !== awardId);
            await user.save();

            res.json({
                success: true,
                message: 'Award deleted successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Delete award error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete award',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Add experience entry
    static async addExperience(req, res) {
        try {
            const { id } = req.params;
            const { title, company, duration, description } = req.body;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            if (!user.profile.experience) {
                user.profile.experience = [];
            }
            user.profile.experience.push({ title, company, duration, description });
            await user.save();

            res.json({
                success: true,
                message: 'Experience added successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Add experience error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add experience'
            });
        }
    }

    // Update experience entry
    static async updateExperience(req, res) {
        try {
            const { id, experienceId } = req.params;
            const { title, company, duration, description } = req.body;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            const experienceIndex = user.profile.experience.findIndex(exp => exp._id.toString() === experienceId);
            if (experienceIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Experience entry not found'
                });
            }

            user.profile.experience[experienceIndex] = { title, company, duration, description };
            await user.save();

            res.json({
                success: true,
                message: 'Experience updated successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Update experience error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update experience'
            });
        }
    }

    // Delete experience entry
    static async deleteExperience(req, res) {
        try {
            const { id, experienceId } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            user.profile.experience = user.profile.experience.filter(exp => exp._id.toString() !== experienceId);
            await user.save();

            res.json({
                success: true,
                message: 'Experience deleted successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Delete experience error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete experience'
            });
        }
    }

    // Add skill
    static async addSkill(req, res) {
        try {
            const { id } = req.params;
            const { skill } = req.body;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            if (!user.profile.skills) {
                user.profile.skills = [];
            }
            if (!user.profile.skills.includes(skill)) {
                user.profile.skills.push(skill);
            }
            await user.save();

            res.json({
                success: true,
                message: 'Skill added successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Add skill error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add skill'
            });
        }
    }

    // Delete skill
    static async deleteSkill(req, res) {
        try {
            const { id, skill } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            user.profile.skills = user.profile.skills.filter(s => s !== skill);
            await user.save();

            res.json({
                success: true,
                message: 'Skill deleted successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Delete skill error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete skill'
            });
        }
    }

    // Add award
    static async addAward(req, res) {
        try {
            const { id } = req.params;
            const { title, organization, year, description } = req.body;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            if (!user.profile.awards) {
                user.profile.awards = [];
            }
            user.profile.awards.push({ title, organization, year, description });
            await user.save();

            res.json({
                success: true,
                message: 'Award added successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Add award error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add award'
            });
        }
    }

    // Update award
    static async updateAward(req, res) {
        try {
            const { id, awardId } = req.params;
            const { title, organization, year, description } = req.body;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            const awardIndex = user.profile.awards.findIndex(award => award._id.toString() === awardId);
            if (awardIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Award not found'
                });
            }

            user.profile.awards[awardIndex] = { title, organization, year, description };
            await user.save();

            res.json({
                success: true,
                message: 'Award updated successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Update award error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update award'
            });
        }
    }

    // Delete award
    static async deleteAward(req, res) {
        try {
            const { id, awardId } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (req.user.id !== id && req.user.role !== 'Admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            user.profile.awards = user.profile.awards.filter(award => award._id.toString() !== awardId);
            await user.save();

            res.json({
                success: true,
                message: 'Award deleted successfully',
                data: { user }
            });
        } catch (error) {
            console.error('Delete award error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete award'
            });
        }
    }
}

module.exports = UserController;
