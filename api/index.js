require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();

// CORS - allow all origins for serverless
app.use(cors());

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Multer for file uploads (memory storage for serverless)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Helper: Upload to Cloudinary
const uploadToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            resource_type: options.resourceType || 'auto',
            folder: 'fileutils',
            ...options
        };

        cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        }).end(buffer);
    });
};

// ==================== IMAGE ROUTES ====================

// Image Transform (combined compress, convert, crop, resize, etc.)
app.post('/api/images/transform', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { transformations } = req.body;
        let transforms = {};

        try {
            transforms = typeof transformations === 'string'
                ? JSON.parse(transformations)
                : transformations || {};
        } catch (e) {
            return res.status(400).json({ error: 'Invalid transformations format' });
        }

        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(req.file.buffer, {
            resourceType: 'image'
        });

        // Build transformation array
        const transformationArray = [];

        // Crop
        if (transforms.crop) {
            transformationArray.push({
                crop: 'crop',
                x: Math.round(transforms.crop.x),
                y: Math.round(transforms.crop.y),
                width: Math.round(transforms.crop.width),
                height: Math.round(transforms.crop.height)
            });
        }

        // Resize
        if (transforms.resize) {
            const resizeObj = { crop: 'scale' };
            if (transforms.resize.width) resizeObj.width = transforms.resize.width;
            if (transforms.resize.height) resizeObj.height = transforms.resize.height;
            transformationArray.push(resizeObj);
        }

        // Rotate
        if (transforms.rotate) {
            transformationArray.push({ angle: transforms.rotate });
        }

        // Brightness
        if (transforms.brightness) {
            transformationArray.push({ effect: `brightness:${transforms.brightness}` });
        }

        // Contrast
        if (transforms.contrast) {
            transformationArray.push({ effect: `contrast:${transforms.contrast}` });
        }

        // Quality
        if (transforms.quality) {
            transformationArray.push({ quality: transforms.quality });
        } else {
            transformationArray.push({ quality: 'auto' });
        }

        // Generate URL
        const urlOptions = {
            transformation: transformationArray,
            secure: true
        };

        if (transforms.format && ['jpg', 'png', 'webp'].includes(transforms.format)) {
            urlOptions.format = transforms.format;
        }

        const transformedUrl = cloudinary.url(uploadResult.public_id, urlOptions);

        res.json({
            success: true,
            downloadUrl: transformedUrl,
            publicId: uploadResult.public_id,
            originalWidth: uploadResult.width,
            originalHeight: uploadResult.height,
            originalSize: uploadResult.bytes
        });

    } catch (error) {
        console.error('Transform error:', error);
        res.status(500).json({ error: 'Failed to process image', details: error.message });
    }
});

// Image Compress
app.post('/api/images/compress', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { quality = 'medium' } = req.body;
        const qualityMap = { low: 30, medium: 60, high: 80 };
        let qualityValue = qualityMap[quality] || parseInt(quality) || 60;

        const uploadResult = await uploadToCloudinary(req.file.buffer);

        const compressedUrl = cloudinary.url(uploadResult.public_id, {
            transformation: [{ quality: qualityValue }, { fetch_format: 'auto' }],
            secure: true
        });

        const estimatedSize = Math.round(uploadResult.bytes * (qualityValue / 100) * 0.7);

        res.json({
            success: true,
            originalSize: uploadResult.bytes,
            compressedSize: estimatedSize,
            compressionRatio: ((1 - estimatedSize / uploadResult.bytes) * 100).toFixed(1) + '%',
            downloadUrl: compressedUrl
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to compress image' });
    }
});

// Image Convert
app.post('/api/images/convert', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { targetFormat = 'webp' } = req.body;
        const uploadResult = await uploadToCloudinary(req.file.buffer);

        const convertedUrl = cloudinary.url(uploadResult.public_id, {
            format: targetFormat,
            transformation: [{ quality: 'auto' }],
            secure: true
        });

        res.json({
            success: true,
            targetFormat,
            downloadUrl: convertedUrl
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to convert image' });
    }
});

// ==================== PDF ROUTES ====================
const { PDFDocument } = require('pdf-lib');

// PDF Compress
app.post('/api/pdf/compress', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const uploadResult = await uploadToCloudinary(req.file.buffer, {
            resourceType: 'raw'
        });

        res.json({
            success: true,
            originalSize: req.file.size,
            downloadUrl: uploadResult.secure_url,
            pageCount: 1,
            note: 'PDF uploaded successfully'
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to process PDF' });
    }
});

// PDF Info
app.post('/api/pdf/info', upload.single('file'), async (req, res) => {
    try {
        const pdfDoc = await PDFDocument.load(req.file.buffer);
        res.json({ pageCount: pdfDoc.getPageCount() });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read PDF' });
    }
});

// PDF Merge
app.post('/api/pdf/merge', upload.array('files', 10), async (req, res) => {
    try {
        const mergedPdf = await PDFDocument.create();

        for (const file of req.files) {
            const pdf = await PDFDocument.load(file.buffer);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedBytes = await mergedPdf.save();
        const buffer = Buffer.from(mergedBytes);

        const uploadResult = await uploadToCloudinary(buffer, { resourceType: 'raw' });

        res.json({
            success: true,
            downloadUrl: uploadResult.secure_url,
            pageCount: mergedPdf.getPageCount(),
            filesCount: req.files.length,
            size: buffer.length
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to merge PDFs' });
    }
});

// PDF Split
app.post('/api/pdf/split', upload.single('file'), async (req, res) => {
    try {
        const { pages } = req.body;
        const sourcePdf = await PDFDocument.load(req.file.buffer);
        const pageRanges = pages.split(';').map(r => r.trim());
        const results = [];

        for (const range of pageRanges) {
            const newPdf = await PDFDocument.create();
            let pageNums = [];

            if (range.includes('-')) {
                const [start, end] = range.split('-').map(Number);
                for (let i = start; i <= end; i++) pageNums.push(i - 1);
            } else {
                range.split(',').forEach(p => pageNums.push(parseInt(p) - 1));
            }

            const copiedPages = await newPdf.copyPages(sourcePdf, pageNums);
            copiedPages.forEach(p => newPdf.addPage(p));

            const pdfBytes = await newPdf.save();
            const buffer = Buffer.from(pdfBytes);
            const uploadResult = await uploadToCloudinary(buffer, { resourceType: 'raw' });

            results.push({
                downloadUrl: uploadResult.secure_url,
                pages: range,
                pageCount: pageNums.length,
                size: buffer.length
            });
        }

        res.json({
            success: true,
            originalPageCount: sourcePdf.getPageCount(),
            splitFiles: results
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to split PDF' });
    }
});

// PDF Reorder
app.post('/api/pdf/reorder', upload.single('file'), async (req, res) => {
    try {
        const { order } = req.body;
        const pageOrder = typeof order === 'string' ? JSON.parse(order) : order;

        const sourcePdf = await PDFDocument.load(req.file.buffer);
        const newPdf = await PDFDocument.create();

        const indices = pageOrder.map(p => p - 1);
        const pages = await newPdf.copyPages(sourcePdf, indices);
        pages.forEach(p => newPdf.addPage(p));

        const pdfBytes = await newPdf.save();
        const buffer = Buffer.from(pdfBytes);
        const uploadResult = await uploadToCloudinary(buffer, { resourceType: 'raw' });

        res.json({
            success: true,
            downloadUrl: uploadResult.secure_url,
            newPageCount: newPdf.getPageCount(),
            size: buffer.length
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to reorder PDF' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', platform: 'vercel' });
});

app.get('/api', (req, res) => {
    res.json({ name: 'FileUtils API', version: '1.0.0', platform: 'vercel' });
});

// Export for Vercel
module.exports = app;
