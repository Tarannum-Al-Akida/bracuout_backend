const AdminController = require('../controllers/AdminController');

// Spam detection middleware
const spamDetector = async (req, res, next) => {
    try {
        // Check for text content in request body
        const textFields = ['description', 'notes', 'studentMessage', 'alumniResponse', 'title'];
        let textContent = '';

        // Collect all text content from request
        textFields.forEach(field => {
            if (req.body[field]) {
                textContent += ' ' + req.body[field];
            }
        });

        // If no text content, proceed
        if (!textContent.trim()) {
            return next();
        }

        // Run spam detection
        const spamResult = await AdminController.detectSpam(textContent, req.user?.id);

        // If spam detected, add warning to request
        if (spamResult.isSpam) {
            req.spamWarning = {
                detected: true,
                score: spamResult.spamScore,
                patterns: spamResult.detectedPatterns,
                threshold: spamResult.threshold
            };

            // Log spam detection
            console.warn(`Spam detected for user ${req.user?.id}:`, {
                score: spamResult.spamScore,
                patterns: spamResult.detectedPatterns,
                content: textContent.substring(0, 100) + '...'
            });
        }

        next();
    } catch (error) {
        console.error('Spam detection middleware error:', error);
        next(); // Continue even if spam detection fails
    }
};

// Rate limiting for messages/content
const messageRateLimit = (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
        return next();
    }

    // Simple in-memory rate limiting (in production, use Redis)
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxMessages = 5; // Max 5 messages per minute

    if (!req.app.locals.messageRateLimit) {
        req.app.locals.messageRateLimit = new Map();
    }

    const userMessages = req.app.locals.messageRateLimit.get(userId) || [];

    // Remove old messages outside the window
    const recentMessages = userMessages.filter(time => now - time < windowMs);

    if (recentMessages.length >= maxMessages) {
        return res.status(429).json({
            success: false,
            message: 'Too many messages. Please wait before sending another.'
        });
    }

    // Add current message
    recentMessages.push(now);
    req.app.locals.messageRateLimit.set(userId, recentMessages);

    next();
};

// Link validation middleware
const linkValidator = (req, res, next) => {
    const textFields = ['description', 'notes', 'studentMessage', 'alumniResponse'];
    const suspiciousDomains = [
        'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'is.gd', 'v.gd', 'ow.ly',
        'shorturl', 'urlshortener', 'linktr.ee'
    ];

    let hasSuspiciousLinks = false;
    const detectedLinks = [];

    textFields.forEach(field => {
        if (req.body[field]) {
            const text = req.body[field];
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = text.match(urlRegex) || [];

            urls.forEach(url => {
                const domain = new URL(url).hostname.toLowerCase();
                if (suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
                    hasSuspiciousLinks = true;
                    detectedLinks.push(url);
                }
            });
        }
    });

    if (hasSuspiciousLinks) {
        req.linkWarning = {
            detected: true,
            links: detectedLinks
        };

        console.warn(`Suspicious links detected for user ${req.user?.id}:`, detectedLinks);
    }

    next();
};

// Content validation middleware
const contentValidator = (req, res, next) => {
    const textFields = ['description', 'notes', 'studentMessage', 'alumniResponse', 'title'];
    const forbiddenWords = [
        'spam', 'scam', 'fake', 'phishing', 'malware', 'virus',
        'hack', 'crack', 'illegal', 'unauthorized'
    ];

    let hasForbiddenContent = false;
    const detectedWords = [];

    textFields.forEach(field => {
        if (req.body[field]) {
            const text = req.body[field].toLowerCase();
            forbiddenWords.forEach(word => {
                if (text.includes(word)) {
                    hasForbiddenContent = true;
                    detectedWords.push(word);
                }
            });
        }
    });

    if (hasForbiddenContent) {
        return res.status(400).json({
            success: false,
            message: 'Content contains forbidden words',
            detectedWords
        });
    }

    next();
};

module.exports = {
    spamDetector,
    messageRateLimit,
    linkValidator,
    contentValidator
};
