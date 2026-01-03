const express = require('express');
const router = express.Router();
const { uploadPdf, handleMulterError } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { uploadToCloudinary, cloudinary } = require('../config/cloudinary');
const { mergePdfs, splitPdf, reorderPdfPages, getPdfInfo } = require('../services/pdfProcessor');

// Cloudinary PDF compression limitations
const MAX_PDF_PAGES_FOR_COMPRESSION = 10;
const MAX_PDF_SIZE_FOR_COMPRESSION = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/pdf/compress
 * Compress a PDF using Cloudinary (limited to ≤10 pages and ≤5MB)
 */
router.post('/compress', uploadLimiter, uploadPdf.single('file'), handleMulterError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const originalSize = req.file.size;

        // Check Cloudinary limitations
        if (originalSize > MAX_PDF_SIZE_FOR_COMPRESSION) {
            return res.status(400).json({
                error: 'PDF too large for Cloudinary compression',
                limitation: `Maximum file size is ${MAX_PDF_SIZE_FOR_COMPRESSION / (1024 * 1024)}MB`,
                suggestion: 'Consider splitting the PDF first or using a different compression tool'
            });
        }

        // Get PDF info
        const pdfInfo = await getPdfInfo(req.file.buffer);

        if (pdfInfo.pageCount > MAX_PDF_PAGES_FOR_COMPRESSION) {
            return res.status(400).json({
                error: 'PDF has too many pages for Cloudinary compression',
                limitation: `Maximum ${MAX_PDF_PAGES_FOR_COMPRESSION} pages supported`,
                pageCount: pdfInfo.pageCount,
                suggestion: 'Consider splitting the PDF first'
            });
        }

        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(req.file.buffer, {
            resourceType: 'image', // PDFs are treated as images for optimization
            format: 'pdf'
        });

        // Generate optimized URL
        const compressedUrl = cloudinary.url(uploadResult.public_id, {
            transformation: [{ quality: 'auto' }],
            format: 'pdf',
            secure: true
        });

        res.json({
            success: true,
            originalSize,
            pageCount: pdfInfo.pageCount,
            downloadUrl: compressedUrl,
            publicId: uploadResult.public_id,
            note: 'Actual compression ratio depends on PDF content (images compress better than text)'
        });

    } catch (error) {
        console.error('PDF compression error:', error);
        res.status(500).json({ error: 'Failed to compress PDF', details: error.message });
    }
});

/**
 * POST /api/pdf/merge
 * Merge multiple PDFs into one (server-side processing with pdf-lib)
 */
router.post('/merge', uploadLimiter, uploadPdf.array('files', 10), handleMulterError, async (req, res) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).json({ error: 'At least 2 PDF files are required for merging' });
        }

        // Get file buffers
        const pdfBuffers = req.files.map(file => file.buffer);

        // Merge PDFs using pdf-lib
        const mergedBuffer = await mergePdfs(pdfBuffers);

        // Get merged PDF info
        const mergedInfo = await getPdfInfo(mergedBuffer);

        // Upload merged PDF to Cloudinary
        const uploadResult = await uploadToCloudinary(mergedBuffer, {
            resourceType: 'raw',
            format: 'pdf',
            public_id: `merged_${Date.now()}`
        });

        res.json({
            success: true,
            pageCount: mergedInfo.pageCount,
            filesCount: req.files.length,
            downloadUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            size: mergedBuffer.length
        });

    } catch (error) {
        console.error('PDF merge error:', error);
        res.status(500).json({ error: 'Failed to merge PDFs', details: error.message });
    }
});

/**
 * POST /api/pdf/split
 * Split a PDF by specified page ranges (server-side processing with pdf-lib)
 * Page ranges format: "1-3;5;7-10" creates 3 separate PDFs
 */
router.post('/split', uploadLimiter, uploadPdf.single('file'), handleMulterError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { pages } = req.body;

        if (!pages) {
            return res.status(400).json({
                error: 'Page ranges required',
                format: 'Use format like "1-3;5;7-10" to create multiple PDFs',
                example: '"1-5" for single PDF with pages 1-5, "1-3;4-6" for two separate PDFs'
            });
        }

        // Get original PDF info
        const originalInfo = await getPdfInfo(req.file.buffer);

        // Split PDF
        const splitResults = await splitPdf(req.file.buffer, pages);

        if (splitResults.length === 0) {
            return res.status(400).json({ error: 'No valid pages specified' });
        }

        // Upload each split PDF to Cloudinary
        const uploadPromises = splitResults.map(async (result, index) => {
            const uploadResult = await uploadToCloudinary(result.buffer, {
                resourceType: 'raw',
                format: 'pdf',
                public_id: `split_${Date.now()}_part${index + 1}`
            });

            return {
                pages: result.pages,
                pageCount: result.pageCount,
                downloadUrl: uploadResult.secure_url,
                publicId: uploadResult.public_id,
                size: result.buffer.length
            };
        });

        const uploadedFiles = await Promise.all(uploadPromises);

        res.json({
            success: true,
            originalPageCount: originalInfo.pageCount,
            splitFiles: uploadedFiles
        });

    } catch (error) {
        console.error('PDF split error:', error);
        res.status(500).json({ error: 'Failed to split PDF', details: error.message });
    }
});

/**
 * POST /api/pdf/reorder
 * Reorder pages in a PDF (server-side processing with pdf-lib)
 */
router.post('/reorder', uploadLimiter, uploadPdf.single('file'), handleMulterError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let { order } = req.body;

        if (!order) {
            return res.status(400).json({
                error: 'Page order required',
                format: 'Array of page numbers in desired order, e.g., [3, 1, 2, 4]'
            });
        }

        // Parse order if it's a string
        if (typeof order === 'string') {
            try {
                order = JSON.parse(order);
            } catch (e) {
                // Try comma-separated format
                order = order.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
            }
        }

        if (!Array.isArray(order) || order.length === 0) {
            return res.status(400).json({ error: 'Invalid order format' });
        }

        // Get original PDF info
        const originalInfo = await getPdfInfo(req.file.buffer);

        // Reorder pages
        const reorderedBuffer = await reorderPdfPages(req.file.buffer, order);
        const reorderedInfo = await getPdfInfo(reorderedBuffer);

        // Upload reordered PDF to Cloudinary
        const uploadResult = await uploadToCloudinary(reorderedBuffer, {
            resourceType: 'raw',
            format: 'pdf',
            public_id: `reordered_${Date.now()}`
        });

        res.json({
            success: true,
            originalPageCount: originalInfo.pageCount,
            newPageCount: reorderedInfo.pageCount,
            newOrder: order,
            downloadUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            size: reorderedBuffer.length
        });

    } catch (error) {
        console.error('PDF reorder error:', error);
        res.status(500).json({ error: 'Failed to reorder PDF pages', details: error.message });
    }
});

/**
 * POST /api/pdf/info
 * Get PDF metadata (page count, etc.)
 */
router.post('/info', uploadPdf.single('file'), handleMulterError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const info = await getPdfInfo(req.file.buffer);

        res.json({
            success: true,
            pageCount: info.pageCount,
            title: info.title,
            author: info.author,
            size: req.file.size
        });

    } catch (error) {
        console.error('PDF info error:', error);
        res.status(500).json({ error: 'Failed to get PDF info', details: error.message });
    }
});

module.exports = router;
