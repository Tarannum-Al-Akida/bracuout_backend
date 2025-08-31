const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

class AuthController {
    // Register new user
    static async register(req, res) {
        try {
            const { name, email, password, role, department, batch, company, jobTitle } = req.body;
            const bracuIdCard = req.file;

            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }

            // Validate role-specific requirements
            if ((role === 'Alumni' || role === 'Student') && !bracuIdCard) {
                return res.status(400).json({
                    success: false,
                    message: 'BRACU ID card is required for verification'
                });
            }

            // Create user object
            const userData = {
                name,
                email,
                password,
                role,
                isVerified: false // All users start as unverified until admin approves
            };

            // Add role-specific fields
            if (role === 'Student' || role === 'Alumni') {
                userData.profile = {
                    department,
                    batch
                };
            }

            if (role === 'Recruiter') {
                userData.profile = {
                    company,
                    jobTitle
                };
            }

            // Add ID card for students and alumni
            if (role === 'Alumni' || role === 'Student') {
                if (bracuIdCard) {
                    userData.profile.bracuIdCard = bracuIdCard.filename;
                    if (role === 'Alumni') {
                        userData.alumniVerification = {
                            idCardUploaded: true,
                            idCardVerified: false
                        };
                    } else if (role === 'Student') {
                        userData.studentVerification = {
                            studentIdCardUploaded: true,
                            studentIdCardVerified: false
                        };
                    }
                }
            }

            // Add recruiter verification fields
            if (role === 'Recruiter') {
                userData.recruiterVerification = {
                    companyDocumentUploaded: false,
                    companyDocumentVerified: false
                };
            }

            // Create user
            const user = await User.create(userData);

            // Generate token
            const token = generateToken(user._id);

            res.status(201).json({
                success: true,
                message: 'Account created successfully. Please wait for admin verification before you can access the platform.',
                data: {
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        isVerified: user.isVerified
                    },
                    token
                }
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Registration failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Login user
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // Find user by email
            const user = await User.findOne({ email }).select('+password');
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Check if user is blocked
            if (user.isBlocked) {
                return res.status(401).json({
                    success: false,
                    message: 'Account has been blocked. Please contact admin.'
                });
            }

            // Check if user is verified (for all user types)
            if (!user.isVerified) {
                return res.status(401).json({
                    success: false,
                    message: 'Account pending verification. Please wait for admin approval.'
                });
            }

            // Check password
            const isPasswordValid = await user.correctPassword(password);

            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Generate token
            const token = generateToken(user._id);

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        isVerified: user.isVerified,
                        profile: user.profile
                    },
                    token
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Login failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Create admin account (Development only - REMOVE IN PRODUCTION)
    static async createAdmin(req, res) {
        try {
            // Only allow in development environment
            if (process.env.NODE_ENV === 'production') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin creation not allowed in production'
                });
            }

            const { name, email, password } = req.body;

            // Check if admin already exists
            const existingAdmin = await User.findOne({ role: 'Admin' });
            if (existingAdmin) {
                return res.status(400).json({
                    success: false,
                    message: 'Admin account already exists'
                });
            }

            // Create admin user
            const adminData = {
                name: name || 'Admin User',
                email: email || 'admin@bracu.edu.bd',
                password: password || 'Admin@123',
                role: 'Admin',
                isVerified: true,
                profile: {
                    department: 'Administration',
                    batch: 'Admin'
                }
            };

            const admin = await User.create(adminData);

            res.status(201).json({
                success: true,
                message: 'Admin account created successfully',
                data: {
                    user: {
                        _id: admin._id,
                        name: admin.name,
                        email: admin.email,
                        role: admin.role,
                        isVerified: admin.isVerified
                    }
                }
            });
        } catch (error) {
            console.error('Create admin error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create admin account',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get current user
    static async getCurrentUser(req, res) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                data: {
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        isVerified: user.isVerified,
                        profile: user.profile
                    }
                }
            });
        } catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user data',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Forgot password
    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User with this email does not exist'
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            user.passwordResetToken = crypto
                .createHash('sha256')
                .update(resetToken)
                .digest('hex');
            user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

            await user.save();

            // TODO: Send email with reset token
            // For now, just return success
            res.json({
                success: true,
                message: 'Password reset email sent'
            });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send reset email',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Reset password
    static async resetPassword(req, res) {
        try {
            const { token, password } = req.body;

            // Get hashed token
            const hashedToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const user = await User.findOne({
                passwordResetToken: hashedToken,
                passwordResetExpires: { $gt: Date.now() }
            });

            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired reset token'
                });
            }

            // Set new password
            user.password = password;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;

            await user.save();

            res.json({
                success: true,
                message: 'Password reset successful'
            });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reset password',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Verify email for recruiters and alumni
    static async verifyEmail(req, res) {
        try {
            const { email, role, bracuId } = req.query;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            // Check if user exists
            const user = await User.findOne({ email });
            if (user) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered'
                });
            }

            // Validate recruiter domain
            if (role === 'Recruiter') {
                const domain = email.split('@')[1];
                // Add your domain validation logic here
                const validDomains = ['company.com', 'recruiter.com']; // Example domains
                if (!validDomains.includes(domain)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid recruiter domain'
                    });
                }
            }

            // Validate alumni BRACU ID
            if (role === 'Alumni' && bracuId) {
                // Add your BRACU ID validation logic here
                const bracuIdPattern = /^\d{8}$/; // Example: 8-digit ID
                if (!bracuIdPattern.test(bracuId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid BRACU ID format'
                    });
                }
            }

            res.json({
                success: true,
                message: 'Email verification successful',
                data: {
                    email,
                    role,
                    isAvailable: true
                }
            });
        } catch (error) {
            console.error('Email verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Email verification failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Logout (client-side token removal)
    static async logout(req, res) {
        try {
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = AuthController;
