const express = require('express');
const router = express.Router();
const { uploadImage, handleMulterError } = require('../middleware/validation');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { uploadToCloudinary, getTransformationUrl, cloudinary } = require('../config/cloudinary');

// Quality mapping for compression levels
const QUALITY_MAP = {
    low: 30,
    medium: 60,
    high: 80
};

/**
 * POST /api/images/compress
 * Compress an image with specified quality level
 */
router.post('/compress', uploadLimiter, uploadImage.single('file'), handleMulterError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { quality = 'medium' } = req.body;

        // Determine quality value
        let qualityValue;
        if (QUALITY_MAP[quality]) {
            qualityValue = QUALITY_MAP[quality];
        } else {
            qualityValue = parseInt(quality) || 60;
            qualityValue = Math.max(1, Math.min(100, qualityValue));
        }

        // Upload original to Cloudinary
        const uploadResult = await uploadToCloudinary(req.file.buffer, {
            resourceType: 'image'
        });

        // Generate compressed URL with quality transformation
        const compressedUrl = cloudinary.url(uploadResult.public_id, {
            transformation: [
                { quality: qualityValue },
                { fetch_format: 'auto' }
            ],
            secure: true
        });

        // Get compressed file info
        const compressedInfo = await new Promise((resolve) => {
            // Estimate compressed size based on quality
            const estimatedSize = Math.round(uploadResult.bytes * (qualityValue / 100) * 0.7);
            resolve({ bytes: estimatedSize });
        });

        res.json({
            success: true,
            originalSize: uploadResult.bytes,
            compressedSize: compressedInfo.bytes,
            compressionRatio: ((1 - compressedInfo.bytes / uploadResult.bytes) * 100).toFixed(1) + '%',
            downloadUrl: compressedUrl,
            publicId: uploadResult.public_id,
            width: uploadResult.width,
            height: uploadResult.height
        });

    } catch (error) {
        console.error('Compression error:', error);
        res.status(500).json({ error: 'Failed to compress image', details: error.message });
    }
});

/**
 * POST /api/images/convert
 * Convert image to different format (jpg, png, webp)
 */
router.post('/convert', uploadLimiter, uploadImage.single('file'), handleMulterError, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { targetFormat = 'webp' } = req.body;
        const allowedFormats = ['jpg', 'jpeg', 'png', 'webp'];

        const format = targetFormat.toLowerCase();
        if (!allowedFormats.includes(format)) {
            return res.status(400).json({
                error: `Invalid format. Allowed: ${allowedFormats.join(', ')}`
            });
        }

        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(req.file.buffer, {
            resourceType: 'image'
        });

        // Generate URL with format conversion
        const convertedUrl = cloudinary.url(uploadResult.public_id, {
            format: format === 'jpg' ? 'jpg' : format,
            transformation: [{ quality: 'auto' }],
            secure: true
        });

        res.json({
            success: true,
            originalFormat: req.file.mimetype.split('/')[1],
            targetFormat: format,
            downloadUrl: convertedUrl,
            publicId: uploadResult.public_id,
            width: uploadResult.width,
            height: uploadResult.height
        });

    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Failed to convert image', details: error.message });
    }
});

/**
 * POST /api/images/transform
 * Apply transformations: crop, resize, rotate, brightness, contrast
 */
router.post('/transform', uploadLimiter, uploadImage.single('file'), handleMulterError, async (req, res) => {
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

        // Crop transformation
        if (transforms.crop) {
            const { x, y, width, height } = transforms.crop;
            transformationArray.push({
                crop: 'crop',
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(width),
                height: Math.round(height)
            });
        }

        // Aspect ratio crop (if no manual crop)
        if (transforms.aspectRatio && !transforms.crop) {
            const ratioMap = {
                '1:1': '1:1',
                '4:3': '4:3',
                '3:4': '3:4',
                '16:9': '16:9',
                '9:16': '9:16'
            };
            if (ratioMap[transforms.aspectRatio]) {
                transformationArray.push({
                    aspect_ratio: ratioMap[transforms.aspectRatio],
                    crop: 'crop',
                    gravity: 'center'
                });
            }
        }

        // Resize transformation
        if (transforms.resize) {
            const resizeObj = { crop: 'scale' };
            if (transforms.resize.width) resizeObj.width = transforms.resize.width;
            if (transforms.resize.height) resizeObj.height = transforms.resize.height;
            transformationArray.push(resizeObj);
        }

        // Rotate transformation
        if (transforms.rotate) {
            transformationArray.push({ angle: transforms.rotate });
        }

        // Brightness adjustment (-100 to 100)
        if (transforms.brightness !== undefined && transforms.brightness !== 0) {
            transformationArray.push({
                effect: `brightness:${Math.max(-100, Math.min(100, transforms.brightness))}`
            });
        }

        // Contrast adjustment (-100 to 100)
        if (transforms.contrast !== undefined && transforms.contrast !== 0) {
            transformationArray.push({
                effect: `contrast:${Math.max(-100, Math.min(100, transforms.contrast))}`
            });
        }

        // Add quality setting (compression)
        if (transforms.quality) {
            let qualityValue = transforms.quality;
            if (QUALITY_MAP[qualityValue]) {
                qualityValue = QUALITY_MAP[qualityValue];
            } else {
                qualityValue = Math.max(1, Math.min(100, parseInt(qualityValue) || 80));
            }
            transformationArray.push({ quality: qualityValue });
        } else {
            // Default to auto quality
            transformationArray.push({ quality: 'auto' });
        }

        // Determine output format
        const outputFormat = transforms.format || null;

        // Generate transformed URL
        const urlOptions = {
            transformation: transformationArray,
            secure: true
        };

        if (outputFormat && ['jpg', 'jpeg', 'png', 'webp'].includes(outputFormat.toLowerCase())) {
            urlOptions.format = outputFormat.toLowerCase() === 'jpeg' ? 'jpg' : outputFormat.toLowerCase();
        }

        const transformedUrl = cloudinary.url(uploadResult.public_id, urlOptions);

        res.json({
            success: true,
            downloadUrl: transformedUrl,
            publicId: uploadResult.public_id,
            appliedTransformations: transforms,
            originalWidth: uploadResult.width,
            originalHeight: uploadResult.height
        });

    } catch (error) {
        console.error('Transformation error:', error);
        res.status(500).json({ error: 'Failed to transform image', details: error.message });
    }
});

/**
 * GET /api/images/preview/:publicId
 * Generate preview URL with transformations
 */
router.get('/preview/:publicId', (req, res) => {
    try {
        const { publicId } = req.params;
        const transforms = req.query;

        const transformationArray = [];

        if (transforms.width || transforms.height) {
            const resizeObj = { crop: 'scale' };
            if (transforms.width) resizeObj.width = parseInt(transforms.width);
            if (transforms.height) resizeObj.height = parseInt(transforms.height);
            transformationArray.push(resizeObj);
        }

        if (transforms.rotate) {
            transformationArray.push({ angle: parseInt(transforms.rotate) });
        }

        transformationArray.push({ quality: 'auto:low' }); // Lower quality for preview

        const previewUrl = cloudinary.url(publicId, {
            transformation: transformationArray,
            secure: true
        });

        res.json({ previewUrl });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate preview' });
    }
});

module.exports = router;
