const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = uploadDir;

        // Create subdirectories based on file type
        if (file.fieldname === 'profilePhoto') {
            uploadPath = path.join(uploadDir, 'profiles');
        } else if (file.fieldname === 'resume') {
            uploadPath = path.join(uploadDir, 'resumes');
        } else if (file.fieldname === 'idCard') {
            uploadPath = path.join(uploadDir, 'idcards');
        } else if (file.fieldname === 'coverLetter') {
            uploadPath = path.join(uploadDir, 'coverletters');
        }

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (file.fieldname === 'profilePhoto') {
        // Only images for profile photos
        if (allowedImageTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, JPG, PNG, and WebP images are allowed for profile photos.'), false);
        }
    } else if (file.fieldname === 'idCard') {
        // Only images for ID cards
        if (allowedImageTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, JPG, PNG, and WebP images are allowed for ID cards.'), false);
        }
    } else if (file.fieldname === 'resume' || file.fieldname === 'coverLetter') {
        // Documents for resumes and cover letters
        if (allowedDocTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, and DOCX files are allowed for documents.'), false);
        }
    } else {
        cb(new Error('Invalid file type.'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
        files: 1 // Only one file at a time
    }
});

// Specific upload middlewares
const uploadProfilePhoto = upload.single('profilePhoto');
const uploadResume = upload.single('resume');
const uploadIdCard = upload.single('idCard');
const uploadCoverLetter = upload.single('coverLetter');

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Only one file allowed.'
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    next();
};

// Helper function to get file URL
const getFileUrl = (filename, type) => {
    if (!filename) return null;

    const baseUrl = process.env.NODE_ENV === 'production'
        ? process.env.BASE_URL || 'https://your-domain.com'
        : `http://localhost:${process.env.PORT || 5000}`;

    return `${baseUrl}/uploads/${type}/${filename}`;
};

// Helper function to delete file
const deleteFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

module.exports = {
    uploadProfilePhoto,
    uploadResume,
    uploadIdCard,
    uploadCoverLetter,
    handleUploadError,
    getFileUrl,
    deleteFile
};
