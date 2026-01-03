const multer = require('multer');

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
];

const ALLOWED_PDF_TYPES = ['application/pdf'];

// Configuration from environment or defaults
const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024;
const MAX_FILES_PER_REQUEST = parseInt(process.env.MAX_FILES_PER_REQUEST) || 10;

/**
 * Create a file filter for multer
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {Function} Multer file filter function
 */
const createFileFilter = (allowedTypes) => (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const error = new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

// Multer configuration for image uploads
const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES_PER_REQUEST
    },
    fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES)
});

// Multer configuration for PDF uploads
const uploadPdf = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES_PER_REQUEST
    },
    fileFilter: createFileFilter(ALLOWED_PDF_TYPES)
});

// Multer configuration for any allowed file type
const uploadAny = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES_PER_REQUEST
    },
    fileFilter: createFileFilter([...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES])
});

/**
 * Error handling middleware for multer errors
 */
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: `Too many files. Maximum is ${MAX_FILES_PER_REQUEST} files per request`
            });
        }
        return res.status(400).json({ error: err.message });
    }

    if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: err.message });
    }

    next(err);
};

module.exports = {
    uploadImage,
    uploadPdf,
    uploadAny,
    handleMulterError,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_PDF_TYPES,
    MAX_FILE_SIZE,
    MAX_FILES_PER_REQUEST
};
