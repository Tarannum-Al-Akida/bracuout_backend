const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Job title is required'],
        trim: true,
        maxlength: [100, 'Job title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Job description is required'],
        maxlength: [2000, 'Job description cannot exceed 2000 characters']
    },
    company: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true
    },
    location: {
        type: String,
        required: [true, 'Job location is required'],
        trim: true
    },
    type: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Internship', 'Contract'],
        required: [true, 'Job type is required']
    },
    salary: {
        min: {
            type: Number,
            required: [true, 'Minimum salary is required']
        },
        max: {
            type: Number,
            required: [true, 'Maximum salary is required']
        },
        currency: {
            type: String,
            default: 'USD'
        }
    },
    requirements: {
        skills: [{
            type: String,
            trim: true
        }],
        experience: {
            type: String,
            required: [true, 'Experience requirement is required']
        },
        education: {
            type: String,
            default: 'Any'
        }
    },
    tags: [{
        type: String,
        trim: true
    }],
    deadline: {
        type: Date,
        required: [true, 'Application deadline is required']
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Job poster is required']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    applicants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['applied', 'shortlisted', 'rejected', 'hired'],
            default: 'applied'
        },
        appliedAt: {
            type: Date,
            default: Date.now
        },
        resume: {
            type: String,
            default: ''
        },
        coverLetter: {
            type: String,
            default: ''
        },
        notes: {
            type: String,
            default: ''
        }
    }],
    views: {
        type: Number,
        default: 0
    },
    applications: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for better query performance
jobSchema.index({ postedBy: 1 });
jobSchema.index({ isActive: 1 });
jobSchema.index({ deadline: 1 });
jobSchema.index({ tags: 1 });
jobSchema.index({ 'applicants.userId': 1 });

// Virtual for checking if job is expired
jobSchema.virtual('isExpired').get(function () {
    return new Date() > this.deadline;
});

// Virtual for application count
jobSchema.virtual('applicationCount').get(function () {
    return this.applicants ? this.applicants.length : 0;
});

// Pre-save middleware to update application count
jobSchema.pre('save', function (next) {
    if (!this.applicants) {
        this.applicants = [];
    }
    this.applications = this.applicants.length;
    next();
});

// Instance method to add applicant
jobSchema.methods.addApplicant = function (userId, resume = '', coverLetter = '') {
    // Check if user already applied
    const existingApplication = this.applicants.find(
        app => app.userId.toString() === userId.toString()
    );

    if (existingApplication) {
        throw new Error('User has already applied for this job');
    }

    this.applicants.push({
        userId,
        resume,
        coverLetter,
        appliedAt: new Date()
    });

    return this.save();
};

// Instance method to update applicant status
jobSchema.methods.updateApplicantStatus = function (userId, status) {
    const applicant = this.applicants.find(
        app => app.userId.toString() === userId.toString()
    );

    if (!applicant) {
        throw new Error('Application not found');
    }

    applicant.status = status;
    return this.save();
};

// Static method to find active jobs
jobSchema.statics.findActive = function () {
    return this.find({
        isActive: true,
        deadline: { $gt: new Date() }
    }).populate('postedBy', 'name profile.company');
};

// Static method to find jobs by recruiter
jobSchema.statics.findByRecruiter = function (recruiterId) {
    return this.find({ postedBy: recruiterId }).populate('applicants.userId', 'name email profile');
};

// Ensure virtual fields are serialized
jobSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Job', jobSchema);
