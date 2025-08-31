const Message = require('../models/Message');
const Connection = require('../models/Connection');
const mongoose = require('mongoose');

class MessageController {
    static async sendMessage(req, res) {
        try {
            const { receiverId, message } = req.body;
            if (!receiverId || !message) return res.status(400).json({ success: false, message: 'receiverId and message are required' });
            const isConnected = await Connection.findOne({
                $or: [
                    { requesterId: req.user.id, targetId: receiverId, status: 'approved' },
                    { requesterId: receiverId, targetId: req.user.id, status: 'approved' }
                ]
            });
            if (!isConnected) return res.status(403).json({ success: false, message: 'You can only message connected users' });
            const msg = await Message.create({ senderId: req.user.id, receiverId, message });
            return res.status(201).json({ success: true, message: 'Message sent', data: { message: msg } });
        } catch (error) {
            console.error('Send message error:', error);
            return res.status(500).json({ success: false, message: 'Failed to send message' });
        }
    }

    static async getMessagesForUser(req, res) {
        try {
            const userId = req.user.id;
            const currentUserId = new mongoose.Types.ObjectId(userId);

            // Build conversation threads (one per user pair) with last message
            const threads = await Message.aggregate([
                { $match: { $or: [ { senderId: currentUserId }, { receiverId: currentUserId } ] } },
                { $sort: { createdAt: -1 } },
                {
                    $addFields: {
                        userA: { $cond: [ { $gt: ['$senderId', '$receiverId'] }, '$receiverId', '$senderId' ] },
                        userB: { $cond: [ { $gt: ['$senderId', '$receiverId'] }, '$senderId', '$receiverId' ] }
                    }
                },
                {
                    $group: {
                        _id: { userA: '$userA', userB: '$userB' },
                        lastMessage: { $first: '$$ROOT' }
                    }
                },
                {
                    $addFields: {
                        otherUserId: {
                            $cond: [ { $eq: ['$lastMessage.senderId', currentUserId] }, '$lastMessage.receiverId', '$lastMessage.senderId' ]
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'otherUserId',
                        foreignField: '_id',
                        as: 'other'
                    }
                },
                { $unwind: { path: '$other', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        other: { _id: '$other._id', name: '$other.name', email: '$other.email', role: '$other.role', profile: '$other.profile' },
                        lastMessage: {
                            _id: '$lastMessage._id',
                            senderId: '$lastMessage.senderId',
                            receiverId: '$lastMessage.receiverId',
                            message: '$lastMessage.message',
                            createdAt: '$lastMessage.createdAt'
                        }
                    }
                },
                { $sort: { 'lastMessage.createdAt': -1 } }
            ]);

            return res.json({ success: true, data: { threads } });
        } catch (error) {
            console.error('Get inbox error:', error);
            return res.status(500).json({ success: false, message: 'Failed to get messages' });
        }
    }

    static async getConversationBetweenUsers(req, res) {
        try {
            const otherUserId = req.params.id;
            const userId = req.user.id;
            const messages = await Message.find({
                $or: [
                    { senderId: userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: userId }
                ]
            }).sort({ createdAt: 1 });
            return res.json({ success: true, data: { messages } });
        } catch (error) {
            console.error('Get conversation error:', error);
            return res.status(500).json({ success: false, message: 'Failed to get conversation' });
        }
    }
}

module.exports = MessageController;


