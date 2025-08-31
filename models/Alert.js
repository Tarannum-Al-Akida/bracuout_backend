const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['connectionRequest', 'jobPost', 'approval'],
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    seen: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

alertSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);



