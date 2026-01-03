import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE,
    timeout: 300000, // 5 minutes for large files
});

// Helper to format file size
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Download file to local machine
export const downloadFile = async (url, filename) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        // Create download link
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Cleanup
        window.URL.revokeObjectURL(downloadUrl);

        return true;
    } catch (error) {
        console.error('Download failed:', error);
        throw new Error('Failed to download file');
    }
};

// Image compression
export const compressImage = async (file, quality, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('quality', quality);

    const response = await api.post('/images/compress', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });

    return response.data;
};

// Image format conversion
export const convertImage = async (file, targetFormat, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);

    const response = await api.post('/images/convert', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });

    return response.data;
};

// Image transformations (crop, resize, rotate, brightness, contrast)
export const transformImage = async (file, transformations, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('transformations', JSON.stringify(transformations));

    const response = await api.post('/images/transform', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });

    return response.data;
};

// PDF compression
export const compressPdf = async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/pdf/compress', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });

    return response.data;
};

// PDF merge
export const mergePdfs = async (files, onProgress) => {
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });

    const response = await api.post('/pdf/merge', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });

    return response.data;
};

// PDF split
export const splitPdf = async (file, pages, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pages', pages);

    const response = await api.post('/pdf/split', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });

    return response.data;
};

// PDF reorder
export const reorderPdf = async (file, order, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order', JSON.stringify(order));

    const response = await api.post('/pdf/reorder', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });

    return response.data;
};

// Get PDF info
export const getPdfInfo = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/pdf/info', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });

    return response.data;
};

// Health check
export const checkHealth = async () => {
    const response = await api.get('/health');
    return response.data;
};

export default api;
