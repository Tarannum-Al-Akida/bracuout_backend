const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: [true, 'Job ID is required']
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required']
    },
    alumniId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Alumni ID is required']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters'],
        default: ''
    },
    studentMessage: {
        type: String,
        maxlength: [1000, 'Message cannot exceed 1000 characters'],
        required: [true, 'Student message is required']
    },
    alumniResponse: {
        type: String,
        maxlength: [1000, 'Response cannot exceed 1000 characters'],
        default: ''
    },
    resume: {
        type: String,
        default: ''
    },
    coverLetter: {
        type: String,
        default: ''
    },
    isReadByAlumni: {
        type: Boolean,
        default: false
    },
    isReadByStudent: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for better query performance
referralSchema.index({ jobId: 1 });
referralSchema.index({ studentId: 1 });
referralSchema.index({ alumniId: 1 });
referralSchema.index({ status: 1 });
referralSchema.index({ createdAt: -1 });

// Virtual for checking if referral is expired (30 days)
referralSchema.virtual('isExpired').get(function () {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.createdAt < thirtyDaysAgo;
});

// Instance method to approve referral
referralSchema.methods.approve = function (response = '') {
    this.status = 'approved';
    this.alumniResponse = response;
    this.isReadByStudent = false; // Mark as unread for student
    return this.save();
};

// Instance method to reject referral
referralSchema.methods.reject = function (response = '') {
    this.status = 'rejected';
    this.alumniResponse = response;
    this.isReadByStudent = false; // Mark as unread for student
    return this.save();
};

// Instance method to mark as read by alumni
referralSchema.methods.markAsReadByAlumni = function () {
    this.isReadByAlumni = true;
    return this.save();
};

// Instance method to mark as read by student
referralSchema.methods.markAsReadByStudent = function () {
    this.isReadByStudent = true;
    return this.save();
};

// Static method to find referrals by student
referralSchema.statics.findByStudent = function (studentId) {
    return this.find({ studentId })
        .populate('jobId', 'title company location type')
        .populate('alumniId', 'name profile.company profile.jobTitle')
        .sort({ createdAt: -1 });
};

// Static method to find referrals by alumni
referralSchema.statics.findByAlumni = function (alumniId) {
    return this.find({ alumniId })
        .populate('jobId', 'title company location type')
        .populate('studentId', 'name email profile.department profile.batch')
        .sort({ createdAt: -1 });
};

// Static method to find pending referrals for alumni
referralSchema.statics.findPendingForAlumni = function (alumniId) {
    return this.find({
        alumniId,
        status: 'pending',
        isReadByAlumni: false
    })
        .populate('jobId', 'title company location type')
        .populate('studentId', 'name email profile.department profile.batch')
        .sort({ createdAt: -1 });
};

// Static method to find referrals for a specific job
referralSchema.statics.findByJob = function (jobId) {
    return this.find({ jobId })
        .populate('studentId', 'name email profile.department profile.batch')
        .populate('alumniId', 'name profile.company profile.jobTitle')
        .sort({ createdAt: -1 });
};

// Ensure virtual fields are serialized
referralSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Referral', referralSchema);
