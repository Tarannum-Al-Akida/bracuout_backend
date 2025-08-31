const mongoose = require('mongoose');

const qaStudentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    answers: {
        type: [String],
        default: []
    },
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    }
}, { _id: false });

const qaSessionSchema = new mongoose.Schema({
    recruiterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: false // Optional - can be standalone or job-specific
    },
    sessionTitle: {
        type: String,
        required: true,
        trim: true
    },
    questions: {
        type: [String],
        default: []
    },
    students: {
        type: [qaStudentSchema],
        default: []
    }
}, {
    timestamps: true
});

qaSessionSchema.index({ recruiterId: 1, createdAt: -1 });
qaSessionSchema.index({ jobId: 1 }); // Index for job-specific queries

module.exports = mongoose.model('QASession', qaSessionSchema);



