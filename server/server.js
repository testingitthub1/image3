require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import routes
const imageRoutes = require('./routes/images');
const pdfRoutes = require('./routes/pdf');

// Import middleware
const { apiLimiter } = require('./middleware/rateLimiter');
const { handleMulterError } = require('./middleware/validation');

// Import services
const { startCleanupJob } = require('./services/cleanup');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Increase server timeout for large file processing (5 minutes)
app.use((req, res, next) => {
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000);
    next();
});

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api/images', imageRoutes);
app.use('/api/pdf', pdfRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'File Utility API',
        version: '1.0.0',
        endpoints: {
            images: {
                compress: {
                    method: 'POST',
                    path: '/api/images/compress',
                    description: 'Compress an image',
                    body: 'multipart/form-data with file and quality (low/medium/high or 1-100)'
                },
                convert: {
                    method: 'POST',
                    path: '/api/images/convert',
                    description: 'Convert image format',
                    body: 'multipart/form-data with file and targetFormat (jpg/png/webp)'
                },
                transform: {
                    method: 'POST',
                    path: '/api/images/transform',
                    description: 'Apply transformations (crop, resize, rotate, brightness, contrast)',
                    body: 'multipart/form-data with file and transformations object'
                }
            },
            pdf: {
                compress: {
                    method: 'POST',
                    path: '/api/pdf/compress',
                    description: 'Compress PDF (limited to ≤10 pages, ≤5MB)',
                    body: 'multipart/form-data with file'
                },
                merge: {
                    method: 'POST',
                    path: '/api/pdf/merge',
                    description: 'Merge multiple PDFs',
                    body: 'multipart/form-data with files[] array'
                },
                split: {
                    method: 'POST',
                    path: '/api/pdf/split',
                    description: 'Split PDF by page ranges',
                    body: 'multipart/form-data with file and pages (e.g., "1-3;5;7-10")'
                },
                reorder: {
                    method: 'POST',
                    path: '/api/pdf/reorder',
                    description: 'Reorder PDF pages',
                    body: 'multipart/form-data with file and order array (e.g., [3,1,2,4])'
                },
                info: {
                    method: 'POST',
                    path: '/api/pdf/info',
                    description: 'Get PDF metadata',
                    body: 'multipart/form-data with file'
                }
            }
        },
        limitations: {
            maxFileSize: '20MB',
            maxFilesPerRequest: 10,
            rateLimit: '10 requests per minute per IP',
            pdfCompression: 'Limited to PDFs with ≤10 pages and ≤5MB by Cloudinary',
            fileRetention: 'Files are automatically deleted after 1 hour'
        }
    });
});

// Error handling middleware
app.use(handleMulterError);

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 API documentation: http://localhost:${PORT}/api`);
    console.log(`💚 Health check: http://localhost:${PORT}/api/health\n`);

    // Start cleanup cron job
    if (process.env.CLOUDINARY_CLOUD_NAME) {
        startCleanupJob();
    } else {
        console.warn('⚠️  Cloudinary not configured - cleanup job not started');
        console.warn('   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env\n');
    }
});

module.exports = app;
