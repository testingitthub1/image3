const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload a file buffer to Cloudinary with temporary tagging for auto-cleanup
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadToCloudinary = (buffer, options = {}) => {
  const timestamp = Date.now();
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'temp_uploads',
        tags: ['temp_upload', `uploaded_${timestamp}`],
        resource_type: options.resourceType || 'auto',
        ...options
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Generate a signed URL for secure file download
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - URL generation options
 * @returns {string} Signed URL
 */
const getSignedUrl = (publicId, options = {}) => {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  
  return cloudinary.url(publicId, {
    sign_url: true,
    type: 'authenticated',
    expires_at: expiresAt,
    secure: true,
    ...options
  });
};

/**
 * Get a transformation URL for an image
 * @param {string} publicId - Cloudinary public ID
 * @param {Array} transformations - Array of transformation objects
 * @returns {string} Transformed image URL
 */
const getTransformationUrl = (publicId, transformations = []) => {
  return cloudinary.url(publicId, {
    transformation: transformations,
    secure: true
  });
};

/**
 * Delete a resource from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Type of resource (image, video, raw)
 * @returns {Promise<Object>} Deletion result
 */
const deleteResource = (publicId, resourceType = 'image') => {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true
  });
};

/**
 * Get resources by tag for cleanup operations
 * @param {string} tag - Tag to search for
 * @param {string} resourceType - Type of resource
 * @returns {Promise<Object>} Resources result
 */
const getResourcesByTag = (tag, resourceType = 'image') => {
  return cloudinary.api.resources_by_tag(tag, {
    max_results: 500,
    resource_type: resourceType
  });
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  getSignedUrl,
  getTransformationUrl,
  deleteResource,
  getResourcesByTag
};
