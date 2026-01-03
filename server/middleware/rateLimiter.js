const rateLimit = require('express-rate-limit');

// Rate limiting configuration
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10;

/**
 * General API rate limiter
 * Limits requests per IP address
 */
const apiLimiter = rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_REQUESTS,
    message: {
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(WINDOW_MS / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use X-Forwarded-For if behind a proxy, otherwise use IP
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    }
});

/**
 * Stricter rate limiter for upload endpoints
 * More restrictive to prevent abuse
 */
const uploadLimiter = rateLimit({
    windowMs: WINDOW_MS,
    max: Math.floor(MAX_REQUESTS / 2), // Half the normal limit for uploads
    message: {
        error: 'Upload limit exceeded. Please wait before uploading more files.',
        retryAfter: Math.ceil(WINDOW_MS / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    }
});

module.exports = {
    apiLimiter,
    uploadLimiter
};
