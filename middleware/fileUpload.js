const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = 'uploads/';

        // Determine upload directory based on file type
        switch (file.fieldname) {
            case 'profilePhoto':
                uploadPath += 'profiles/';
                break;
            case 'resume':
                uploadPath += 'resumes/';
                break;
            case 'coverLetter':
                uploadPath += 'coverletters/';
                break;
            case 'bracuIdCard':
                uploadPath += 'idcards/';
                break;
            default:
                uploadPath += 'misc/';
        }

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    let allowedTypes = [];

    // Determine allowed types based on field name
    switch (file.fieldname) {
        case 'profilePhoto':
        case 'bracuIdCard':
            allowedTypes = allowedImageTypes;
            break;
        case 'resume':
        case 'coverLetter':
            allowedTypes = [...allowedImageTypes, ...allowedDocumentTypes];
            break;
        default:
            allowedTypes = [...allowedImageTypes, ...allowedDocumentTypes];
    }

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 5 // Max 5 files per request
    }
});

// Specific upload middlewares
const uploadProfilePhoto = upload.single('profilePhoto');
const uploadResume = upload.single('resume');
const uploadCoverLetter = upload.single('coverLetter');
const uploadIdCard = upload.single('bracuIdCard');
const uploadMultiple = upload.array('files', 5);

// Handle upload errors
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
                message: 'Too many files. Maximum is 5 files.'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected file field.'
            });
        }
    }

    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    next(error);
};

// Get file URL
const getFileUrl = (filename, type = 'misc') => {
    if (!filename) return null;

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    return `${baseUrl}/uploads/${type}/${filename}`;
};

// Delete file
const deleteFile = (filepath) => {
    try {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};

// Validate file size
const validateFileSize = (file, maxSize = 5 * 1024 * 1024) => {
    if (file.size > maxSize) {
        throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
    }
    return true;
};

// Validate file type
const validateFileType = (file, allowedTypes) => {
    if (!allowedTypes.includes(file.mimetype)) {
        throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }
    return true;
};

// Clean up old files
const cleanupOldFiles = (directory, maxAge = 24 * 60 * 60 * 1000) => {
    try {
        if (!fs.existsSync(directory)) return;

        const files = fs.readdirSync(directory);
        const now = Date.now();

        files.forEach(file => {
            const filepath = path.join(directory, file);
            const stats = fs.statSync(filepath);

            if (now - stats.mtime.getTime() > maxAge) {
                fs.unlinkSync(filepath);
                console.log(`Cleaned up old file: ${filepath}`);
            }
        });
    } catch (error) {
        console.error('Error cleaning up old files:', error);
    }
};

module.exports = {
    upload,
    uploadProfilePhoto,
    uploadResume,
    uploadCoverLetter,
    uploadIdCard,
    uploadMultiple,
    handleUploadError,
    getFileUrl,
    deleteFile,
    validateFileSize,
    validateFileType,
    cleanupOldFiles
};
