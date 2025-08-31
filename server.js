const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// Trust proxy for Vercel deployment (fixes rate limiter X-Forwarded-For issue)
app.set('trust proxy', 1);

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
        ? ['https://bracuout-std4.vercel.app', 'https://bracuout-backend-dckn.vercel.app', 'https://bracuout-backend-dckn-2jodwphfi-tarannum-al-akidas-projects.vercel.app', 'https://bracuout.vercel.app']
        : ['http://localhost:3000'],
    credentials: true
}));

// Rate limiting with Vercel-compatible configuration
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 100 : 1000),
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 / 60) || 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Fix for Vercel deployment
    keyGenerator: (req) => {
        // Use X-Forwarded-For header if available (Vercel sets this)
        return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    },
    // Skip rate limiting for certain routes in development
    skip: (req) => {
        if (process.env.NODE_ENV === 'development') {
            return req.method === 'GET';
        }
        return false;
    }
});

// Stricter rate limiter for sensitive operations
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 10 : 50,
    message: {
        success: false,
        message: 'Too many sensitive operations from this IP, please try again later.',
        retryAfter: 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Fix for Vercel deployment
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    }
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

// Global variable to cache the database connection
let cachedDb = null;

// Middleware to ensure database connection before processing routes
const ensureDbConnected = async (req, res, next) => {
    if (mongoose.connection.readyState === 1) {
        console.log('✅ [ensureDbConnected] Database already connected.');
        return next();
    }
    if (mongoose.connection.readyState === 2) {
        console.log('⏳ [ensureDbConnected] Database is connecting...');
        // Wait for the connection to complete
        try {
            await new Promise((resolve, reject) => {
                mongoose.connection.on('connected', resolve);
                mongoose.connection.on('error', reject);
            });
            console.log('✅ [ensureDbConnected] Database connected after waiting.');
            return next();
        } catch (error) {
            console.error('❌ [ensureDbConnected] Error waiting for DB connection:', error);
            return res.status(500).json({ success: false, message: 'Failed to connect to database' });
        }
    }

    console.log('🔌 [ensureDbConnected] Establishing new database connection...');
    try {
        await connectDB();
        console.log('✅ [ensureDbConnected] Database connected successfully.');
        next();
    } catch (error) {
        console.error('❌ [ensureDbConnected] Failed to establish database connection:', error);
        res.status(500).json({ success: false, message: 'Failed to connect to database' });
    }
};

// Apply the database connection middleware to all API routes that need it
app.use('/api', ensureDbConnected);

// Routes
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

// Database test endpoint with comprehensive debugging
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('🔍 [test-db] Environment variables check:');
        console.log('   MONGODB_URI:', process.env.MONGODB_URI ? 'Set (hidden for security)' : 'NOT SET');
        console.log('   NODE_ENV:', process.env.NODE_ENV);
        console.log('   PORT:', process.env.PORT);

        const dbStatus = mongoose.connection.readyState;
        console.log('🔍 [test-db] Database connection status:', dbStatus);
        console.log('   mongoose.connection:', mongoose.connection ? 'Exists' : 'NULL');
        console.log('   mongoose.connection.db:', mongoose.connection.db ? 'Exists' : 'NULL');

        if (mongoose.connection.db) {
            const collections = await mongoose.connection.db.listCollections().toArray();

            res.json({
                success: true,
                database: {
                    status: dbStatus === 1 ? 'connected' : 'disconnected',
                    readyState: dbStatus,
                    collections: collections.map(col => col.name),
                    totalCollections: collections.length
                },
                environment: {
                    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'NOT SET',
                    NODE_ENV: process.env.NODE_ENV || 'undefined',
                    PORT: process.env.PORT || 'undefined'
                },
                connection: {
                    host: mongoose.connection.host || 'N/A',
                    name: mongoose.connection.name || 'N/A',
                    port: mongoose.connection.port || 'N/A'
                },
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                success: false,
                error: 'Database connection object is null',
                debug: {
                    dbStatus,
                    mongooseConnection: mongoose.connection ? 'exists' : 'null',
                    mongooseConnectionDB: mongoose.connection.db ? 'exists' : 'null',
                    environment: {
                        MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'NOT SET',
                        NODE_ENV: process.env.NODE_ENV || 'undefined'
                    }
                },
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ [test-db] Database test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            debug: {
                dbStatus: mongoose.connection.readyState,
                mongooseConnection: mongoose.connection ? 'exists' : 'null',
                mongooseConnectionDB: mongoose.connection.db ? 'exists' : 'null',
                environment: {
                    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'NOT SET',
                    NODE_ENV: process.env.NODE_ENV || 'undefined'
                }
            },
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

// Cached database connection with comprehensive error handling for serverless
const connectDB = async () => {
    if (cachedDb && mongoose.connection.readyState === 1) {
        console.log('♻️ [connectDB] Using existing database connection.');
        return cachedDb;
    }

    console.log('🔌 [connectDB] Starting NEW database connection...');
    try {
        console.log('   Environment:', process.env.NODE_ENV || 'undefined');
        console.log('   MONGODB_URI:', process.env.MONGODB_URI ? 'Set (hidden for security)' : 'NOT SET');
        console.log('   Fallback URI:', 'mongodb://localhost:27017/campus_recruitment');

        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_recruitment';
        console.log('   Using URI:', uri === process.env.MONGODB_URI ? 'MONGODB_URI from env' : 'Fallback localhost');

        mongoose.set('strictQuery', true); // Recommended by Mongoose

        const conn = await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false, // Disable buffering for serverless
            serverSelectionTimeoutMS: 5000, // 5 seconds for server selection
            socketTimeoutMS: 45000, // 45 seconds for socket operations
            connectTimeoutMS: 10000, // 10 seconds for initial connection
        });

        cachedDb = conn; // Cache the connection

        console.log('✅ [connectDB] MongoDB Connected Successfully!');
        console.log(`   Host: ${conn.connection.host}`);
        console.log(`   Database: ${conn.connection.name}`);
        console.log(`   Port: ${conn.connection.port}`);
        console.log(`   Ready State: ${conn.connection.readyState}`);

        return conn;
    } catch (error) {
        console.error('❌ [connectDB] Database connection failed:');
        console.error('   Error:', error.message);
        console.error('   Code:', error.code);
        console.error('   Name:', error.name);

        if (error.code === 'ENOTFOUND') {
            console.error('   🔍 DNS resolution failed - check your MongoDB URI');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('   🔒 Connection refused - check if MongoDB is running and port is open');
        } else if (error.name === 'MongoServerError') {
            console.error('   🗄️  MongoDB server error - check credentials and network access');
        } else if (error.name === 'MongooseServerSelectionError') {
            console.error('   ⚠️  Mongoose server selection error - check network access or URI');
        }

        // Critical: Set cachedDb to null on failure to force a reconnect on next attempt
        cachedDb = null;
        // Don't exit on Vercel - let the server start but mark connection as failed
        console.error('   ⚠️  Server will start but database operations will fail');
        throw error; // Re-throw to be caught by calling middleware/route
    }
};

// No longer directly connecting on module initialization or local server startup, 
// as the middleware will handle it on first API request.
// The local server start now relies on the middleware for its DB connection.
const PORT = process.env.PORT || 5000;

// If running locally, ensure DB connection and then start server
if (require.main === module && process.env.NODE_ENV !== 'test') {
    console.log('⚙️ [Local Server] Starting local server...');
    // In local dev, we want to ensure connection before starting to listen
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`✅ [Local Server] Server running on port ${PORT}`);
            console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }).catch(err => {
        console.error('❌ [Local Server] Failed to start server due to DB connection error:', err);
        process.exit(1); // Exit if local DB connection fails on startup
    });
}

// Export the app. Vercel will import this and run it as a serverless function,
// where the ensureDbConnected middleware will handle the connection.
module.exports = app;
