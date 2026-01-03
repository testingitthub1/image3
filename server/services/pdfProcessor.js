const { PDFDocument } = require('pdf-lib');

/**
 * PDF Processing Service
 * Handles operations that Cloudinary cannot perform:
 * - Merge multiple PDFs
 * - Split PDF by pages
 * - Reorder PDF pages
 */

/**
 * Merge multiple PDF buffers into a single PDF
 * @param {Buffer[]} pdfBuffers - Array of PDF file buffers
 * @returns {Promise<Buffer>} Merged PDF buffer
 */
const mergePdfs = async (pdfBuffers) => {
    const mergedPdf = await PDFDocument.create();

    for (const buffer of pdfBuffers) {
        const pdf = await PDFDocument.load(buffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedBuffer = await mergedPdf.save();
    return Buffer.from(mergedBuffer);
};

/**
 * Parse page range string into array of page indices (0-based)
 * Examples: "1-3,5,7-10" => [0, 1, 2, 4, 6, 7, 8, 9]
 * @param {string} pageString - Page range string
 * @param {number} totalPages - Total number of pages in the PDF
 * @returns {number[]} Array of 0-based page indices
 */
const parsePageRange = (pageString, totalPages) => {
    const pages = new Set();
    const parts = pageString.split(',').map(s => s.trim());

    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            for (let i = start; i <= end && i <= totalPages; i++) {
                if (i >= 1) pages.add(i - 1); // Convert to 0-based index
            }
        } else {
            const pageNum = parseInt(part);
            if (pageNum >= 1 && pageNum <= totalPages) {
                pages.add(pageNum - 1); // Convert to 0-based index
            }
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
};

/**
 * Split a PDF into multiple PDFs based on page ranges
 * @param {Buffer} pdfBuffer - Original PDF buffer
 * @param {string} pageRanges - Comma-separated page ranges (e.g., "1-3,5,7-10")
 * @returns {Promise<{buffer: Buffer, pages: string}[]>} Array of split PDF buffers with their page info
 */
const splitPdf = async (pdfBuffer, pageRanges) => {
    const originalPdf = await PDFDocument.load(pdfBuffer);
    const totalPages = originalPdf.getPageCount();
    const results = [];

    // If pageRanges contains multiple groups separated by semicolons, split into multiple PDFs
    // Otherwise, create a single PDF with the specified pages
    const groups = pageRanges.split(';').map(s => s.trim()).filter(s => s);

    for (const group of groups) {
        const pageIndices = parsePageRange(group, totalPages);

        if (pageIndices.length === 0) continue;

        const newPdf = await PDFDocument.create();
        const pages = await newPdf.copyPages(originalPdf, pageIndices);
        pages.forEach(page => newPdf.addPage(page));

        const buffer = await newPdf.save();
        results.push({
            buffer: Buffer.from(buffer),
            pages: group,
            pageCount: pageIndices.length
        });
    }

    return results;
};

/**
 * Reorder pages in a PDF
 * @param {Buffer} pdfBuffer - Original PDF buffer
 * @param {number[]} newOrder - Array of 1-based page numbers in desired order
 * @returns {Promise<Buffer>} Reordered PDF buffer
 */
const reorderPdfPages = async (pdfBuffer, newOrder) => {
    const originalPdf = await PDFDocument.load(pdfBuffer);
    const totalPages = originalPdf.getPageCount();

    // Validate the new order
    const validOrder = newOrder
        .filter(n => n >= 1 && n <= totalPages)
        .map(n => n - 1); // Convert to 0-based indices

    if (validOrder.length === 0) {
        throw new Error('Invalid page order specified');
    }

    const reorderedPdf = await PDFDocument.create();
    const pages = await reorderedPdf.copyPages(originalPdf, validOrder);
    pages.forEach(page => reorderedPdf.addPage(page));

    const buffer = await reorderedPdf.save();
    return Buffer.from(buffer);
};

/**
 * Get PDF metadata (page count, etc.)
 * @param {Buffer} pdfBuffer - PDF buffer
 * @returns {Promise<Object>} PDF metadata
 */
const getPdfInfo = async (pdfBuffer) => {
    const pdf = await PDFDocument.load(pdfBuffer);
    return {
        pageCount: pdf.getPageCount(),
        title: pdf.getTitle() || null,
        author: pdf.getAuthor() || null
    };
};

module.exports = {
    mergePdfs,
    splitPdf,
    reorderPdfPages,
    getPdfInfo,
    parsePageRange
};
