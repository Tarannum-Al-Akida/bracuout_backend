// Role-based access control middleware
const roleProtect = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

// Verify user is verified (for alumni)
const requireVerification = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.role === 'Alumni' && !req.user.isVerified) {
        return res.status(403).json({
            success: false,
            message: 'Account verification required'
        });
    }

    next();
};

// Check if user is blocked
const checkBlocked = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.user.isBlocked) {
        return res.status(403).json({
            success: false,
            message: 'Account has been blocked. Please contact admin.'
        });
    }

    next();
};

// Optional authentication middleware
const optionalAuth = (req, res, next) => {
    // This middleware doesn't require authentication but adds user info if available
    // Used for routes that can work with or without authentication
    next();
};

// Resource ownership check middleware
const checkOwnership = (resourceModel, resourceIdParam = 'id') => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[resourceIdParam];
            const resource = await resourceModel.findById(resourceId);

            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found'
                });
            }

            // Check if user owns the resource or is admin
            const ownerField = resource.postedBy ? 'postedBy' : 'userId';
            const isOwner = resource[ownerField]?.toString() === req.user.id;
            const isAdmin = req.user.role === 'Admin';

            if (!isOwner && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only modify your own resources.'
                });
            }

            req.resource = resource;
            next();
        } catch (error) {
            console.error('Ownership check error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify resource ownership'
            });
        }
    };
};

// Profile completion check middleware
const requireProfileComplete = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Check if profile is complete based on role
    let isComplete = true;
    const profile = req.user.profile || {};

    switch (req.user.role) {
        case 'Student':
        case 'Alumni':
            if (!profile.department || !profile.batch) {
                isComplete = false;
            }
            break;
        case 'Recruiter':
            if (!profile.company || !profile.jobTitle) {
                isComplete = false;
            }
            break;
    }

    if (!isComplete) {
        return res.status(400).json({
            success: false,
            message: 'Profile completion required',
            requiredFields: req.user.role === 'Student' || req.user.role === 'Alumni'
                ? ['department', 'batch']
                : ['company', 'jobTitle']
        });
    }

    next();
};

// Spam score check middleware
const checkSpamScore = (maxScore = 5) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (req.user.spamScore >= maxScore) {
            return res.status(403).json({
                success: false,
                message: 'Account temporarily restricted due to suspicious activity'
            });
        }

        next();
    };
};

module.exports = {
    roleProtect,
    requireVerification,
    checkBlocked,
    optionalAuth,
    checkOwnership,
    requireProfileComplete,
    checkSpamScore
};
