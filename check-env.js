require('dotenv').config();

console.log('🔍 Environment Variables Check');
console.log('==============================');
console.log('');

// Check required variables
const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'NODE_ENV'
];

console.log('📋 Required Variables:');
requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        if (varName === 'JWT_SECRET') {
            console.log(`   ✅ ${varName}: Set (${value.length} characters)`);
        } else if (varName === 'MONGODB_URI') {
            // Show first part of URI for verification
            const uri = value;
            if (uri.startsWith('mongodb+srv://')) {
                const username = uri.split('://')[1].split(':')[0];
                const host = uri.split('@')[1].split('/')[0];
                console.log(`   ✅ ${varName}: Set (mongodb+srv://${username}@${host}/...)`);
            } else {
                console.log(`   ✅ ${varName}: Set (${uri})`);
            }
        } else {
            console.log(`   ✅ ${varName}: ${value}`);
        }
    } else {
        console.log(`   ❌ ${varName}: NOT SET`);
    }
});

console.log('');

// Check optional variables
const optionalVars = [
    'PORT',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS'
];

console.log('📋 Optional Variables:');
optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`   ✅ ${varName}: ${value}`);
    } else {
        console.log(`   ⚠️  ${varName}: Using default value`);
    }
});

console.log('');

// Check environment
console.log('🌍 Environment:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Current working directory: ${process.cwd()}`);
console.log(`   Platform: ${process.platform}`);

console.log('');
console.log('✨ Environment check completed!');
