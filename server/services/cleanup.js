const cron = require('node-cron');
const { cloudinary, getResourcesByTag, deleteResource } = require('../config/cloudinary');

// Configuration
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 15;
const FILE_TTL_HOURS = parseInt(process.env.FILE_TTL_HOURS) || 1;

/**
 * Check if a resource is expired based on its creation time
 * @param {string} createdAt - ISO date string of creation time
 * @returns {boolean} True if expired
 */
const isExpired = (createdAt) => {
    const creationTime = new Date(createdAt).getTime();
    const expirationTime = FILE_TTL_HOURS * 60 * 60 * 1000; // Convert hours to ms
    return Date.now() - creationTime > expirationTime;
};

/**
 * Clean up expired resources of a specific type
 * @param {string} resourceType - Type of resource to clean up
 * @returns {Promise<number>} Number of deleted resources
 */
const cleanupResourceType = async (resourceType) => {
    let deletedCount = 0;

    try {
        const result = await getResourcesByTag('temp_upload', resourceType);

        if (!result.resources || result.resources.length === 0) {
            return 0;
        }

        const expiredResources = result.resources.filter(r => isExpired(r.created_at));

        for (const resource of expiredResources) {
            try {
                await deleteResource(resource.public_id, resourceType);
                console.log(`[Cleanup] Deleted ${resourceType}: ${resource.public_id}`);
                deletedCount++;
            } catch (error) {
                console.error(`[Cleanup] Failed to delete ${resource.public_id}:`, error.message);
            }
        }
    } catch (error) {
        console.error(`[Cleanup] Error fetching ${resourceType} resources:`, error.message);
    }

    return deletedCount;
};

/**
 * Main cleanup function - removes all expired temporary files
 */
const cleanupExpiredFiles = async () => {
    console.log('[Cleanup] Starting cleanup job...');
    const startTime = Date.now();

    try {
        // Clean up images
        const imagesDeleted = await cleanupResourceType('image');

        // Clean up raw files (PDFs)
        const rawDeleted = await cleanupResourceType('raw');

        const totalDeleted = imagesDeleted + rawDeleted;
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[Cleanup] Completed in ${duration}s - Deleted ${totalDeleted} files (${imagesDeleted} images, ${rawDeleted} raw)`);
    } catch (error) {
        console.error('[Cleanup] Job failed:', error.message);
    }
};

/**
 * Start the cleanup cron job
 */
const startCleanupJob = () => {
    // Create cron expression for the interval (e.g., "*/15 * * * *" for every 15 minutes)
    const cronExpression = `*/${CLEANUP_INTERVAL} * * * *`;

    cron.schedule(cronExpression, cleanupExpiredFiles, {
        scheduled: true,
        timezone: 'UTC'
    });

    console.log(`[Cleanup] Cron job started - runs every ${CLEANUP_INTERVAL} minutes`);
    console.log(`[Cleanup] Files older than ${FILE_TTL_HOURS} hour(s) will be deleted`);
};

/**
 * Run cleanup immediately (for manual trigger or testing)
 */
const runCleanupNow = () => {
    return cleanupExpiredFiles();
};

module.exports = {
    startCleanupJob,
    runCleanupNow,
    cleanupExpiredFiles
};
