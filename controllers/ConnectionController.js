const Connection = require('../models/Connection');
const Alert = require('../models/Alert');

class ConnectionController {
    static async requestConnection(req, res) {
        try {
            const { targetId } = req.body;
            if (!targetId) return res.status(400).json({ success: false, message: 'targetId is required' });

            const existing = await Connection.findOne({
                $or: [
                    { requesterId: req.user.id, targetId },
                    { requesterId: targetId, targetId: req.user.id }
                ]
            });
            if (existing) return res.status(400).json({ success: false, message: 'Connection already exists or pending' });

            const conn = await Connection.create({ requesterId: req.user.id, targetId, status: 'pending' });
            await Alert.create({ userId: targetId, type: 'connectionRequest', message: 'New connection request received.' });
            return res.status(201).json({ success: true, message: 'Connection requested', data: { connection: conn } });
        } catch (error) {
            console.error('Request connection error:', error);
            return res.status(500).json({ success: false, message: 'Failed to request connection' });
        }
    }

    static async approveConnection(req, res) {
        try {
            const { id } = req.params;
            const conn = await Connection.findById(id);
            if (!conn) return res.status(404).json({ success: false, message: 'Connection not found' });
            if (conn.targetId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
            conn.status = 'approved';
            await conn.save();
            await Alert.create({ userId: conn.requesterId, type: 'approval', message: 'Your connection request was approved.' });
            return res.json({ success: true, message: 'Connection approved', data: { connection: conn } });
        } catch (error) {
            console.error('Approve connection error:', error);
            return res.status(500).json({ success: false, message: 'Failed to approve connection' });
        }
    }

    static async listConnections(req, res) {
        try {
            const userId = req.user.id;
            const conns = await Connection.find({
                $or: [
                    { requesterId: userId, status: 'approved' },
                    { targetId: userId, status: 'approved' }
                ]
            })
                .populate('requesterId', 'name email role profile')
                .populate('targetId', 'name email role profile')
                .sort({ updatedAt: -1 });
            return res.json({ success: true, data: { connections: conns } });
        } catch (error) {
            console.error('List connections error:', error);
            return res.status(500).json({ success: false, message: 'Failed to get connections' });
        }
    }

    static async listIncoming(req, res) {
        try {
            const userId = req.user.id;
            const pending = await Connection.find({ targetId: userId, status: 'pending' })
                .populate('requesterId', 'name email role profile')
                .populate('targetId', 'name email role profile')
                .sort({ createdAt: -1 });
            return res.json({ success: true, data: { incoming: pending } });
        } catch (error) {
            console.error('List incoming error:', error);
            return res.status(500).json({ success: false, message: 'Failed to get incoming requests' });
        }
    }

    static async listOutgoing(req, res) {
        try {
            const userId = req.user.id;
            const pending = await Connection.find({ requesterId: userId, status: 'pending' })
                .populate('requesterId', 'name email role profile')
                .populate('targetId', 'name email role profile')
                .sort({ createdAt: -1 });
            return res.json({ success: true, data: { outgoing: pending } });
        } catch (error) {
            console.error('List outgoing error:', error);
            return res.status(500).json({ success: false, message: 'Failed to get outgoing requests' });
        }
    }

    static async status(req, res) {
        try {
            const userId = req.user.id;
            const { targetId } = req.query;
            if (!targetId) return res.status(400).json({ success: false, message: 'targetId is required' });
            const conn = await Connection.findOne({
                $or: [
                    { requesterId: userId, targetId },
                    { requesterId: targetId, targetId: userId }
                ]
            });
            if (!conn) return res.json({ success: true, data: { status: 'none' } });
            let relation;
            if (conn.status === 'approved') relation = 'approved';
            else if (conn.status === 'pending') {
                relation = conn.targetId.toString() === userId ? 'pendingIn' : 'pendingOut';
            } else relation = 'none';
            return res.json({ success: true, data: { status: relation, connectionId: conn._id } });
        } catch (error) {
            console.error('Status error:', error);
            return res.status(500).json({ success: false, message: 'Failed to get status' });
        }
    }
}

module.exports = ConnectionController;


