const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't include password in queries by default
    },
    role: {
        type: String,
        enum: ['Student', 'Alumni', 'Recruiter', 'Admin'],
        required: [true, 'Role is required']
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    // Alumni-specific verification fields
    alumniVerification: {
        idCardUploaded: {
            type: Boolean,
            default: false
        },
        idCardVerified: {
            type: Boolean,
            default: false
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        verifiedAt: {
            type: Date,
            default: null
        },
        verificationNotes: {
            type: String,
            default: ''
        }
    },
    // Student verification fields
    studentVerification: {
        studentIdCardUploaded: {
            type: Boolean,
            default: false
        },
        studentIdCardVerified: {
            type: Boolean,
            default: false
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        verifiedAt: {
            type: Date,
            default: null
        },
        verificationNotes: {
            type: String,
            default: ''
        }
    },
    // Recruiter verification fields
    recruiterVerification: {
        companyDocumentUploaded: {
            type: Boolean,
            default: false
        },
        companyDocumentVerified: {
            type: Boolean,
            default: false
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        verifiedAt: {
            type: Date,
            default: null
        },
        verificationNotes: {
            type: String,
            default: ''
        }
    },
    profile: {
        photo: {
            type: String,
            default: ''
        },
        department: {
            type: String,
            default: '',
            required: function () { return this.role === 'Student' || this.role === 'Alumni'; }
        },
        batch: {
            type: String,
            default: '',
            required: function () { return this.role === 'Student' || this.role === 'Alumni'; }
        },
        school: {
            type: String,
            default: ''
        },
        college: {
            type: String,
            default: ''
        },
        jobTitle: {
            type: String,
            default: ''
        },
        company: {
            type: String,
            default: ''
        },
        bracuIdCard: {
            type: String,
            default: ''
        },
        phone: {
            type: String,
            default: ''
        },
        linkedin: {
            type: String,
            default: ''
        },
        github: {
            type: String,
            default: ''
        },
        // Resume fields for students
        experience: [{
            _id: {
                type: mongoose.Schema.Types.ObjectId,
                auto: true
            },
            title: {
                type: String,
                default: ''
            },
            company: {
                type: String,
                default: ''
            },
            duration: {
                type: String,
                default: ''
            },
            description: {
                type: String,
                default: ''
            }
        }],
        skills: [{
            _id: {
                type: mongoose.Schema.Types.ObjectId,
                auto: true
            },
            type: String,
            default: ''
        }],
        awards: [{
            _id: {
                type: mongoose.Schema.Types.ObjectId,
                auto: true
            },
            title: {
                type: String,
                default: ''
            },
            organization: {
                type: String,
                default: ''
            },
            year: {
                type: String,
                default: ''
            },
            description: {
                type: String,
                default: ''
            }
        }],
        languages: [{
            _id: {
                type: mongoose.Schema.Types.ObjectId,
                auto: true
            },
            type: String,
            default: ''
        }],
        interests: [{
            _id: {
                type: mongoose.Schema.Types.ObjectId,
                auto: true
            },
            type: String,
            default: ''
        }]
    },
    resume: {
        type: String,
        default: ''
    },
    spamScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String,
        default: null
    },
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpires: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'alumniVerification.idCardVerified': 1 });
userSchema.index({ 'studentVerification.studentIdCardVerified': 1 });
userSchema.index({ 'recruiterVerification.companyDocumentVerified': 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Hash password with cost of 12
        this.password = await bcrypt.hash(this.password, 12);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to ensure profile object exists
userSchema.pre('save', function (next) {
    if (!this.profile) {
        this.profile = {};
    }
    if (!this.alumniVerification) {
        this.alumniVerification = {};
    }
    if (!this.studentVerification) {
        this.studentVerification = {};
    }
    if (!this.recruiterVerification) {
        this.recruiterVerification = {};
    }
    next();
});

// Instance method to check if password is correct
userSchema.methods.correctPassword = async function (candidatePassword) {
    if (!this.password) {
        return false;
    }

    const result = await bcrypt.compare(candidatePassword, this.password);
    return result;
};

// Instance method to check if user can perform actions
userSchema.methods.canPerformAction = function () {
    return this.isVerified && !this.isBlocked;
};

// Static method to find users by role
userSchema.statics.findByRole = function (role) {
    return this.find({ role, isVerified: true, isBlocked: false });
};

// Virtual for user's full profile status
userSchema.virtual('profileComplete').get(function () {
    if (this.role === 'Student' || this.role === 'Alumni') {
        return !!(this.profile && this.profile.department && this.profile.batch);
    }
    if (this.role === 'Recruiter') {
        return !!(this.profile && this.profile.company);
    }
    return true;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
