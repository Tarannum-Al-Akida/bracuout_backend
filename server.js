const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const jobRoutes = require('./routes/jobs');
const referralRoutes = require('./routes/referrals');
const adminRoutes = require('./routes/admin');
const alertRoutes = require('./routes/alerts');
const qaRoutes = require('./routes/qa-sessions');
const messageRoutes = require('./routes/messages');
const resumeRoutes = require('./routes/resume');
const courseRoutes = require('./routes/courses');
const connectionRoutes = require('./routes/connections');
const jobFAQRoutes = require('./routes/job-faq');

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://bracuout-std4.vercel.app', 'https://bracuout-backend-dckn.vercel.app', 'https://bracuout-backend-dckn-2jodwphfi-tarannum-al-akidas-projects.vercel.app']
        : ['http://localhost:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 100 : 1000), // More lenient in development
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 / 60) || 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for certain routes in development
    skip: (req) => {
        if (process.env.NODE_ENV === 'development') {
            // Skip rate limiting for GET requests in development
            return req.method === 'GET';
        }
        return false;
    }
});

// Stricter rate limiter for sensitive operations (auth, job creation, etc.)
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 10 : 50, // Stricter limits
    message: {
        success: false,
        message: 'Too many sensitive operations from this IP, please try again later.',
        retryAfter: 15
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply general rate limiter to all API routes
app.use('/api/', limiter);

// Apply stricter rate limiter to sensitive routes
app.use('/api/auth', strictLimiter);
app.use('/api/jobs', (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        strictLimiter(req, res, next);
    } else {
        next();
    }
});
app.use('/api/referrals', (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        strictLimiter(req, res, next);
    } else {
        next();
    }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Static files for specific upload directories
app.use('/upload/idcard', express.static(path.join(__dirname, 'uploads', 'idcards')));
app.use('/upload/profile', express.static(path.join(__dirname, 'uploads', 'profiles')));
app.use('/upload/resume', express.static(path.join(__dirname, 'uploads', 'resumes')));
app.use('/upload/coverletter', express.static(path.join(__dirname, 'uploads', 'coverletters')));
app.use('/upload/misc', express.static(path.join(__dirname, 'uploads', 'misc')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/qa-sessions', qaRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/job-faq', jobFAQRoutes);

// Upload route for general file uploads
app.post('/api/upload', (req, res) => {
    // This endpoint will be handled by the fileUpload middleware
    // It's a placeholder for the general upload functionality
    res.status(501).json({
        success: false,
        message: 'Upload endpoint not implemented yet. Use specific upload endpoints.'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Campus Recruitment API is running',
        timestamp: new Date().toISOString()
    });
});

// Test file serving endpoint
app.get('/api/test-files', (req, res) => {
    const fs = require('fs');
    const path = require('path');

    const resumeDir = path.join(__dirname, 'uploads', 'resumes');
    const coverLetterDir = path.join(__dirname, 'uploads', 'coverletters');

    try {
        const resumeFiles = fs.existsSync(resumeDir) ? fs.readdirSync(resumeDir) : [];
        const coverLetterFiles = fs.existsSync(coverLetterDir) ? fs.readdirSync(coverLetterDir) : [];

        res.json({
            success: true,
            data: {
                resumeFiles,
                coverLetterFiles,
                resumeDir,
                coverLetterDir,
                resumeUrls: resumeFiles.map(file => `/upload/resume/${file}`),
                coverLetterUrls: coverLetterFiles.map(file => `/upload/coverletter/${file}`)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error reading upload directories',
            error: error.message
        });
    }
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState;
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        res.json({
            success: true,
            database: {
                status: dbStatus === 1 ? 'connected' : 'disconnected',
                readyState: dbStatus,
                collections: collections.map(col => col.name),
                totalCollections: collections.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Real-time database monitoring endpoint
app.get('/api/db-status', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState;
        const dbStatusText = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        // Get connection pool stats
        const poolStats = mongoose.connection.pool ? {
            totalConnectionCount: mongoose.connection.pool.totalConnectionCount,
            availableConnectionCount: mongoose.connection.pool.availableConnectionCount,
            pendingConnectionCount: mongoose.connection.pool.pendingConnectionCount
        } : 'Not available';
        
        // Get database stats
        let dbStats = null;
        if (dbStatus === 1) {
            try {
                dbStats = await mongoose.connection.db.stats();
            } catch (statsError) {
                dbStats = { error: statsError.message };
            }
        }
        
        const statusData = {
            success: true,
            timestamp: new Date().toISOString(),
            database: {
                status: dbStatusText[dbStatus] || 'unknown',
                readyState: dbStatus,
                connected: dbStatus === 1,
                host: mongoose.connection.host || 'N/A',
                name: mongoose.connection.name || 'N/A',
                port: mongoose.connection.port || 'N/A'
            },
            connectionPool: poolStats,
            databaseStats: dbStats,
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
        
        res.json(statusData);
    } catch (error) {
        console.error('Database status error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    // Handle rate limiting errors specifically
    if (err.status === 429) {
        return res.status(429).json({
            success: false,
            message: err.message || 'Too many requests, please try again later.',
            retryAfter: err.retryAfter || 15
        });
    }

    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Database connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_recruitment', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

// Start server
const PORT = process.env.PORT || 5000;

// Only start server if not in test environment and if this file is run directly (not imported)
if (require.main === module && process.env.NODE_ENV !== 'test') {
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    });
}

module.exports = app;
