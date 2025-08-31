const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Database Debug Script Starting...');
console.log('📡 Environment:', process.env.NODE_ENV || 'development');
console.log('🗄️  MongoDB URI:', process.env.MONGODB_URI ? 'Set (hidden for security)' : 'Using default localhost');

// Test database connection
async function testDatabaseConnection() {
    try {
        console.log('\n🔌 Testing database connection...');
        
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_recruitment', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Database connected successfully!');
        console.log(`📍 Host: ${conn.connection.host}`);
        console.log(`🗄️  Database: ${conn.connection.name}`);
        console.log(`🔗 Port: ${conn.connection.port}`);
        
        // Test database operations
        await testDatabaseOperations(conn);
        
        // Close connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('   Error:', error.message);
        console.error('   Code:', error.code);
        console.error('   Stack:', error.stack);
        
        if (error.code === 'ENOTFOUND') {
            console.error('   🔍 DNS resolution failed - check your MongoDB URI');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('   🔒 Connection refused - check if MongoDB is running');
        } else if (error.code === 'MONGODB_ERROR') {
            console.error('   🗄️  MongoDB authentication failed - check credentials');
        }
    }
}

// Test database operations
async function testDatabaseOperations(conn) {
    try {
        console.log('\n🧪 Testing database operations...');
        
        // Test ping
        console.log('📡 Testing ping...');
        const pingResult = await conn.connection.db.admin().ping();
        console.log('✅ Ping result:', pingResult);
        
        // List collections
        console.log('📚 Listing collections...');
        const collections = await conn.connection.db.listCollections().toArray();
        console.log('✅ Collections found:', collections.map(col => col.name));
        
        // Test User model if it exists
        try {
            const User = require('./models/User');
            console.log('👤 Testing User model...');
            
            const userCount = await User.countDocuments();
            console.log('✅ User count:', userCount);
            
            if (userCount > 0) {
                const sampleUser = await User.findOne().select('-password');
                console.log('✅ Sample user found:', {
                    id: sampleUser._id,
                    email: sampleUser.email,
                    role: sampleUser.role
                });
            }
        } catch (modelError) {
            console.log('⚠️  User model test skipped:', modelError.message);
        }
        
        // Test database stats
        console.log('📊 Getting database stats...');
        const stats = await conn.connection.db.stats();
        console.log('✅ Database stats:', {
            collections: stats.collections,
            dataSize: stats.dataSize,
            storageSize: stats.storageSize,
            indexes: stats.indexes
        });
        
    } catch (error) {
        console.error('❌ Database operations test failed:', error.message);
    }
}

// Test environment variables
function testEnvironmentVariables() {
    console.log('\n🔧 Testing environment variables...');
    
    const requiredVars = [
        'MONGODB_URI',
        'JWT_SECRET',
        'NODE_ENV'
    ];
    
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            console.log(`✅ ${varName}: Set (${varName === 'JWT_SECRET' ? 'hidden' : value})`);
        } else {
            console.log(`❌ ${varName}: Not set`);
        }
    });
    
    // Check optional variables
    const optionalVars = [
        'PORT',
        'RATE_LIMIT_WINDOW_MS',
        'RATE_LIMIT_MAX_REQUESTS'
    ];
    
    optionalVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            console.log(`✅ ${varName}: ${value}`);
        } else {
            console.log(`⚠️  ${varName}: Using default value`);
        }
    });
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting comprehensive database debugging...\n');
    
    testEnvironmentVariables();
    await testDatabaseConnection();
    
    console.log('\n✨ Database debugging completed!');
}

// Run if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { testDatabaseConnection, testDatabaseOperations };
