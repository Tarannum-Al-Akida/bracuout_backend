const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// prevent duplicate pairs (both directions)
connectionSchema.index({ requesterId: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Connection', connectionSchema);



