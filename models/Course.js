const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    courseName: {
        type: String,
        required: true,
        trim: true
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    duration: {
        type: String,
        default: '6 months'
    },
    description: {
        type: String,
        default: ''
    },
    banner: {
        type: String,
        default: ''
    },
    videoUrl: {
        type: String,
        default: ''
    },
    studentsEnrolled: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // New fields for tracking system
    checkpoints: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ''
        },
        order: {
            type: Number,
            required: true
        }
    }],
    enrollments: [{
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        enrolledAt: {
            type: Date,
            default: Date.now
        },
        completedCheckpoints: [{
            checkpointId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            completedAt: {
                type: Date,
                default: Date.now
            }
        }],
        isExpired: {
            type: Boolean,
            default: false
        }
    }]
}, {
    timestamps: true
});

courseSchema.index({ courseName: 1 });

module.exports = mongoose.model('Course', courseSchema);



