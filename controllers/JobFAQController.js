const JobFAQ = require('../models/JobFAQ');

class JobFAQController {
    // Create a new FAQ entry
    static async createFAQ(req, res) {
        try {
            const { question, answer, category, tags, jobId } = req.body;

            if (!question || !answer || !category) {
                return res.status(400).json({
                    success: false,
                    message: 'Question, answer, and category are required'
                });
            }

            const faqData = {
                question: question.trim(),
                answer: answer.trim(),
                category,
                tags: tags || [],
                createdBy: req.user.id,
                ...(jobId && { jobId })
            };

            const faq = await JobFAQ.create(faqData);
            await faq.populate('createdBy', 'name profile.company');
            if (jobId) {
                await faq.populate('jobId', 'title company');
            }

            return res.status(201).json({
                success: true,
                message: 'FAQ created successfully',
                data: { faq }
            });
        } catch (error) {
            console.error('Create FAQ error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create FAQ'
            });
        }
    }

    // Get all active FAQs
    static async getAllFAQs(req, res) {
        try {
            const { category, jobId, search } = req.query;
            let query = { isActive: true };

            // Filter by category
            if (category && category !== 'all') {
                query.category = category;
            }

            // Filter by job
            if (jobId) {
                query.jobId = jobId;
            }

            // Search functionality
            if (search) {
                query.$or = [
                    { question: { $regex: search, $options: 'i' } },
                    { answer: { $regex: search, $options: 'i' } },
                    { tags: { $in: [new RegExp(search, 'i')] } }
                ];
            }

            const faqs = await JobFAQ.find(query)
                .populate('createdBy', 'name profile.company')
                .populate('jobId', 'title company')
                .sort({ helpfulScore: -1, createdAt: -1 });

            return res.json({
                success: true,
                data: { faqs },
                message: `Found ${faqs.length} FAQ(s)`
            });
        } catch (error) {
            console.error('Get all FAQs error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch FAQs'
            });
        }
    }

    // Get FAQ by ID
    static async getFAQById(req, res) {
        try {
            const { id } = req.params;
            const faq = await JobFAQ.findById(id)
                .populate('createdBy', 'name profile.company')
                .populate('jobId', 'title company');

            if (!faq) {
                return res.status(404).json({
                    success: false,
                    message: 'FAQ not found'
                });
            }

            // Increment views
            await faq.incrementViews();

            return res.json({
                success: true,
                data: { faq }
            });
        } catch (error) {
            console.error('Get FAQ by ID error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch FAQ'
            });
        }
    }

    // Update FAQ
    static async updateFAQ(req, res) {
        try {
            const { id } = req.params;
            const { question, answer, category, tags, isActive } = req.body;

            const faq = await JobFAQ.findById(id);
            if (!faq) {
                return res.status(404).json({
                    success: false,
                    message: 'FAQ not found'
                });
            }

            // Check if user is the creator
            if (faq.createdBy.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this FAQ'
                });
            }

            const updateData = {};
            if (question) updateData.question = question.trim();
            if (answer) updateData.answer = answer.trim();
            if (category) updateData.category = category;
            if (tags) updateData.tags = tags;
            if (typeof isActive === 'boolean') updateData.isActive = isActive;

            const updatedFAQ = await JobFAQ.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate('createdBy', 'name profile.company')
                .populate('jobId', 'title company');

            return res.json({
                success: true,
                message: 'FAQ updated successfully',
                data: { faq: updatedFAQ }
            });
        } catch (error) {
            console.error('Update FAQ error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update FAQ'
            });
        }
    }

    // Delete FAQ
    static async deleteFAQ(req, res) {
        try {
            const { id } = req.params;
            const faq = await JobFAQ.findById(id);

            if (!faq) {
                return res.status(404).json({
                    success: false,
                    message: 'FAQ not found'
                });
            }

            // Check if user is the creator
            if (faq.createdBy.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this FAQ'
                });
            }

            await JobFAQ.findByIdAndDelete(id);

            return res.json({
                success: true,
                message: 'FAQ deleted successfully'
            });
        } catch (error) {
            console.error('Delete FAQ error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete FAQ'
            });
        }
    }

    // Mark FAQ as helpful/not helpful
    static async markHelpful(req, res) {
        try {
            const { id } = req.params;
            const { isHelpful } = req.body;

            if (typeof isHelpful !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'isHelpful must be a boolean'
                });
            }

            const faq = await JobFAQ.findById(id);
            if (!faq) {
                return res.status(404).json({
                    success: false,
                    message: 'FAQ not found'
                });
            }

            await faq.markHelpful(isHelpful);

            return res.json({
                success: true,
                message: 'Feedback recorded successfully',
                data: {
                    helpfulCount: faq.helpfulCount,
                    notHelpfulCount: faq.notHelpfulCount,
                    helpfulScore: faq.helpfulScore
                }
            });
        } catch (error) {
            console.error('Mark helpful error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to record feedback'
            });
        }
    }

    // Get FAQ categories
    static async getCategories(req, res) {
        try {
            const categories = [
                'Application Process',
                'Job Requirements',
                'Company Culture',
                'Interview Process',
                'Benefits & Compensation',
                'Remote Work',
                'Career Growth',
                'Other'
            ];

            return res.json({
                success: true,
                data: { categories }
            });
        } catch (error) {
            console.error('Get categories error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch categories'
            });
        }
    }

    // Get FAQs by recruiter
    static async getRecruiterFAQs(req, res) {
        try {
            const faqs = await JobFAQ.findByRecruiter(req.user.id);

            return res.json({
                success: true,
                data: { faqs }
            });
        } catch (error) {
            console.error('Get recruiter FAQs error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch recruiter FAQs'
            });
        }
    }
}

module.exports = JobFAQController;

