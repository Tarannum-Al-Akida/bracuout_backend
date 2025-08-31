const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const User = require('./models/User');

// Admin credentials
const adminData = {
    name: 'Admin User',
    email: 'admin@bracu.edu.bd',
    password: 'Admin@123',
    role: 'Admin',
    isVerified: true,
    profile: {
        department: 'Administration',
        batch: 'Admin'
    }
};

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_recruitment', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected for resetting admin');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

// Reset admin user
const resetAdmin = async () => {
    try {
        // Delete existing admin user
        const deletedAdmin = await User.deleteOne({ email: adminData.email });
        console.log('Deleted existing admin user:', deletedAdmin.deletedCount > 0 ? 'YES' : 'NO');

        // Create new admin user (password will be hashed by User model pre-save middleware)
        const adminUser = new User(adminData);
        await adminUser.save();

        console.log('Admin user recreated successfully!');
        console.log('Email:', adminData.email);
        console.log('Password:', adminData.password);
        console.log('Role:', adminData.role);

    } catch (error) {
        console.error('Error resetting admin user:', error);
    }
};

// Main function
const main = async () => {
    await connectDB();
    await resetAdmin();
    mongoose.connection.close();
    console.log('Admin reset completed');
};

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = { resetAdmin };
