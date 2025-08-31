const mongoose = require('mongoose');

const jobFAQSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, 'FAQ question is required'],
        trim: true,
        maxlength: [500, 'Question cannot exceed 500 characters']
    },
    answer: {
        type: String,
        required: [true, 'FAQ answer is required'],
        trim: true,
        maxlength: [2000, 'Answer cannot exceed 2000 characters']
    },
    category: {
        type: String,
        required: [true, 'FAQ category is required'],
        enum: ['Application Process', 'Job Requirements', 'Company Culture', 'Interview Process', 'Benefits & Compensation', 'Remote Work', 'Career Growth', 'Other'],
        default: 'Other'
    },
    tags: [{
        type: String,
        trim: true
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'FAQ creator is required']
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: false // Optional - can be general or job-specific
    },
    isActive: {
        type: Boolean,
        default: true
    },
    helpfulCount: {
        type: Number,
        default: 0
    },
    notHelpfulCount: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for better query performance
jobFAQSchema.index({ category: 1, isActive: 1 });
jobFAQSchema.index({ jobId: 1 });
jobFAQSchema.index({ createdBy: 1 });
jobFAQSchema.index({ tags: 1 });
jobFAQSchema.index({ createdAt: -1 });

// Virtual for total helpful score
jobFAQSchema.virtual('helpfulScore').get(function () {
    return this.helpfulCount - this.notHelpfulCount;
});

// Instance method to mark as helpful/not helpful
jobFAQSchema.methods.markHelpful = function (isHelpful) {
    if (isHelpful) {
        this.helpfulCount += 1;
    } else {
        this.notHelpfulCount += 1;
    }
    return this.save();
};

// Instance method to increment views
jobFAQSchema.methods.incrementViews = function () {
    this.views += 1;
    return this.save();
};

// Static method to find active FAQs
jobFAQSchema.statics.findActive = function () {
    return this.find({ isActive: true })
        .populate('createdBy', 'name profile.company')
        .populate('jobId', 'title company')
        .sort({ helpfulScore: -1, createdAt: -1 });
};

// Static method to find FAQs by category
jobFAQSchema.statics.findByCategory = function (category) {
    return this.find({ category, isActive: true })
        .populate('createdBy', 'name profile.company')
        .populate('jobId', 'title company')
        .sort({ helpfulScore: -1, createdAt: -1 });
};

// Static method to find FAQs for a specific job
jobFAQSchema.statics.findByJob = function (jobId) {
    return this.find({ jobId, isActive: true })
        .populate('createdBy', 'name profile.company')
        .sort({ helpfulScore: -1, createdAt: -1 });
};

// Static method to find FAQs by recruiter
jobFAQSchema.statics.findByRecruiter = function (recruiterId) {
    return this.find({ createdBy: recruiterId })
        .populate('jobId', 'title company')
        .sort({ createdAt: -1 });
};

// Ensure virtual fields are serialized
jobFAQSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('JobFAQ', jobFAQSchema);

