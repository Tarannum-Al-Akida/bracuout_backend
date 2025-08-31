const mongoose = require('mongoose');

const spamReportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reportedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        required: true,
        enum: ['fake_profile', 'spam_messages', 'inappropriate_content', 'fake_job_posting', 'other']
    },
    description: {
        type: String,
        required: true,
        maxlength: 500
    },
    evidence: {
        type: String,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['pending', 'investigating', 'resolved', 'dismissed'],
        default: 'pending'
    },
    adminNotes: {
        type: String,
        maxlength: 1000
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
spamReportSchema.index({ reportedUser: 1, status: 1 });
spamReportSchema.index({ reporter: 1 });
spamReportSchema.index({ status: 1, createdAt: -1 });

// Instance methods
spamReportSchema.methods.resolve = function (adminId, notes, action) {
    this.status = 'resolved';
    this.resolvedBy = adminId;
    this.resolvedAt = new Date();
    this.adminNotes = notes;
    return this.save();
};

spamReportSchema.methods.dismiss = function (adminId, notes) {
    this.status = 'dismissed';
    this.resolvedBy = adminId;
    this.resolvedAt = new Date();
    this.adminNotes = notes;
    return this.save();
};

// Static methods
spamReportSchema.statics.findByStatus = function (status) {
    return this.find({ status }).populate('reporter', 'name email role').populate('reportedUser', 'name email role spamScore');
};

spamReportSchema.statics.findByReportedUser = function (userId) {
    return this.find({ reportedUser: userId }).populate('reporter', 'name email role');
};

spamReportSchema.statics.findPending = function () {
    return this.find({ status: 'pending' }).populate('reporter', 'name email role').populate('reportedUser', 'name email role spamScore');
};

module.exports = mongoose.model('SpamReport', spamReportSchema);
