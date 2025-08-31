const QASession = require('../models/QASession');

class QASessionController {
    static async createQASession(req, res) {
        try {
            const { sessionTitle, questions, jobId } = req.body;
            if (!sessionTitle) return res.status(400).json({ success: false, message: 'sessionTitle is required' });

            const qaData = {
                recruiterId: req.user.id,
                sessionTitle,
                questions: questions || []
            };

            // If jobId is provided, link the session to that job
            if (jobId) {
                qaData.jobId = jobId;
            }

            const qa = await QASession.create(qaData);
            return res.status(201).json({ success: true, message: 'Q&A session created', data: { session: qa } });
        } catch (error) {
            console.error('Create QA session error:', error);
            return res.status(500).json({ success: false, message: 'Failed to create Q&A session' });
        }
    }

    static async getQASessionDetails(req, res) {
        try {
            const { id } = req.params;
            const qa = await QASession.findById(id)
                .populate('recruiterId', 'name email')
                .populate('students.userId', 'name email');
            if (!qa) return res.status(404).json({ success: false, message: 'Session not found' });
            return res.json({ success: true, data: { session: qa } });
        } catch (error) {
            console.error('Get QA session error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch session' });
        }
    }

    static async markQASessionCompleted(req, res) {
        try {
            const { id } = req.params;
            const qa = await QASession.findById(id);
            if (!qa) return res.status(404).json({ success: false, message: 'Session not found' });
            if (qa.recruiterId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
            qa.students = qa.students.map(s => ({ ...s.toObject(), status: 'completed' }));
            await qa.save();
            return res.json({ success: true, message: 'Session marked completed', data: { session: qa } });
        } catch (error) {
            console.error('Mark QA completed error:', error);
            return res.status(500).json({ success: false, message: 'Failed to update session' });
        }
    }

    static async getStudentQAStatus(req, res) {
        try {
            const { id } = req.params; // session id
            const qa = await QASession.findById(id).select('students questions sessionTitle');
            if (!qa) return res.status(404).json({ success: false, message: 'Session not found' });
            const me = qa.students.find(s => s.userId.toString() === req.user.id);
            return res.json({ success: true, data: { status: me?.status || 'pending', answers: me?.answers || [], questions: qa.questions, sessionTitle: qa.sessionTitle } });
        } catch (error) {
            console.error('Get student QA status error:', error);
            return res.status(500).json({ success: false, message: 'Failed to get status' });
        }
    }

    static async listSessions(req, res) {
        try {
            const sessions = await QASession.find({}).sort({ createdAt: -1 }).select('sessionTitle recruiterId createdAt');
            return res.json({ success: true, data: { sessions } });
        } catch (error) {
            console.error('List sessions error:', error);
            return res.status(500).json({ success: false, message: 'Failed to list sessions' });
        }
    }

    static async submitAnswers(req, res) {
        try {
            const { id } = req.params; // session id
            const { answers } = req.body; // array of strings
            const qa = await QASession.findById(id);
            if (!qa) return res.status(404).json({ success: false, message: 'Session not found' });
            const idx = qa.students.findIndex(s => s.userId.toString() === req.user.id);
            if (idx === -1) {
                qa.students.push({ userId: req.user.id, answers: answers || [], status: 'completed' });
            } else {
                qa.students[idx].answers = answers || [];
                qa.students[idx].status = 'completed';
            }
            await qa.save();
            return res.json({ success: true, message: 'Answers submitted' });
        } catch (error) {
            console.error('Submit answers error:', error);
            return res.status(500).json({ success: false, message: 'Failed to submit answers' });
        }
    }

    // Get Q&A sessions for a specific job
    static async getJobQASessions(req, res) {
        try {
            const { jobId } = req.params;
            const sessions = await QASession.find({ jobId })
                .populate('recruiterId', 'name email profile.company')
                .select('sessionTitle questions createdAt')
                .sort({ createdAt: -1 });

            return res.json({
                success: true,
                data: { sessions },
                message: `Found ${sessions.length} Q&A session(s) for this job`
            });
        } catch (error) {
            console.error('Get job QA sessions error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch job Q&A sessions' });
        }
    }

    // Get Q&A sessions by recruiter (including job-linked ones)
    static async getRecruiterQASessions(req, res) {
        try {
            const { includeJobs = true } = req.query;

            let query = { recruiterId: req.user.id };
            if (includeJobs === 'false') {
                query.jobId = { $exists: false };
            }

            const sessions = await QASession.find(query)
                .populate('jobId', 'title company')
                .select('sessionTitle questions jobId createdAt')
                .sort({ createdAt: -1 });

            return res.json({
                success: true,
                data: { sessions }
            });
        } catch (error) {
            console.error('Get recruiter QA sessions error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch recruiter Q&A sessions' });
        }
    }
}

module.exports = QASessionController;


