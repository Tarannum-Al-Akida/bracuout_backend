const Alert = require('../models/Alert');

class AlertController {
    static async createAlert(req, res) {
        try {
            const { userId, type, message } = req.body;
            if (!userId || !type || !message) {
                return res.status(400).json({ success: false, message: 'userId, type and message are required' });
            }
            const alert = await Alert.create({ userId, type, message });
            return res.status(201).json({ success: true, message: 'Alert created', data: { alert } });
        } catch (error) {
            console.error('Create alert error:', error);
            return res.status(500).json({ success: false, message: 'Failed to create alert' });
        }
    }

    static async getUserAlerts(req, res) {
        try {
            const alerts = await Alert.find({ userId: req.user.id }).sort({ createdAt: -1 });
            return res.json({ success: true, data: { alerts } });
        } catch (error) {
            console.error('Get alerts error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
        }
    }

    static async markAlertAsSeen(req, res) {
        try {
            const { id } = req.params;
            const alert = await Alert.findOneAndUpdate(
                { _id: id, userId: req.user.id },
                { seen: true },
                { new: true }
            );
            if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
            return res.json({ success: true, message: 'Alert marked as seen', data: { alert } });
        } catch (error) {
            console.error('Mark seen error:', error);
            return res.status(500).json({ success: false, message: 'Failed to update alert' });
        }
    }
}

module.exports = AlertController;



