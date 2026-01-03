import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import FileUploader from '../components/FileUploader'
import { compressPdf, formatFileSize, downloadFile } from '../services/api'

const MAX_PAGES = 10
const MAX_SIZE_MB = 5

export default function PdfCompressor() {
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState(null)
    const [warning, setWarning] = useState(null)

    const handleFileSelect = useCallback((files) => {
        const selectedFile = files[0]
        setFile(selectedFile)
        setResult(null)

        // Check size limit
        if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
            setWarning(`This PDF is larger than ${MAX_SIZE_MB}MB. Cloudinary may not be able to compress it.`)
        } else {
            setWarning(null)
        }
    }, [])

    const handleCompress = async () => {
        if (!file) return

        setUploading(true)
        setProgress(0)

        try {
            const response = await compressPdf(file, setProgress)
            setResult(response)
            toast.success('PDF compressed successfully!')
        } catch (error) {
            console.error('Compression error:', error)
            toast.error(error.response?.data?.error || 'Failed to compress PDF')

            // Show limitation message if applicable
            if (error.response?.data?.limitation) {
                setWarning(error.response.data.limitation)
            }
        } finally {
            setUploading(false)
        }
    }

    const handleDownload = async () => {
        if (result?.downloadUrl) {
            try {
                const baseName = file.name.replace(/\.[^/.]+$/, '')
                const filename = `${baseName}_compressed.pdf`
                await downloadFile(result.downloadUrl, filename)
                toast.success('Download started!')
            } catch (error) {
                toast.error('Download failed')
            }
        }
    }

    const handleReset = () => {
        setFile(null)
        setResult(null)
        setProgress(0)
        setWarning(null)
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">📄 PDF Compressor</h1>
                <p className="page-subtitle">
                    Reduce PDF file size while keeping text readable
                </p>
            </div>

            {/* Limitation Notice */}
            <div className="message message-warning" style={{ marginBottom: '1.5rem' }}>
                <strong>⚠️ Cloudinary Limitations:</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                    <li>Maximum 10 pages per PDF</li>
                    <li>Maximum 5MB file size</li>
                    <li>Works best with image-heavy PDFs (text-only PDFs may not compress much)</li>
                </ul>
            </div>

            {!file ? (
                <FileUploader
                    accept={{ 'application/pdf': ['.pdf'] }}
                    maxFiles={1}
                    onFilesSelected={handleFileSelect}
                    label="Drop your PDF here, or click to select"
                    hint="PDF files only • Max 20MB (5MB recommended for compression)"
                />
            ) : (
                <div>
                    {/* File Info */}
                    <div className="file-list">
                        <div className="file-item">
                            <div className="file-info">
                                <span className="file-icon">📄</span>
                                <div>
                                    <div className="file-name">{file.name}</div>
                                    <div className="file-size">{formatFileSize(file.size)}</div>
                                </div>
                            </div>
                            <button className="file-remove" onClick={handleReset}>✕</button>
                        </div>
                    </div>

                    {/* Warning */}
                    {warning && (
                        <div className="message message-warning" style={{ marginTop: '1rem' }}>
                            ⚠️ {warning}
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="result-box">
                            <div className="result-stats">
                                <div className="stat-item">
                                    <div className="stat-value">{formatFileSize(result.originalSize)}</div>
                                    <div className="stat-label">Original Size</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{result.pageCount}</div>
                                    <div className="stat-label">Pages</div>
                                </div>
                            </div>
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                {result.note}
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="btn btn-success btn-lg" onClick={handleDownload}>
                                    ⬇️ Download Compressed PDF
                                </button>
                                <button className="btn btn-secondary btn-lg" onClick={handleReset}>
                                    Compress Another
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Compress Button */}
                    {!result && (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleCompress}
                                disabled={uploading}
                            >
                                {uploading ? `Compressing... ${progress}%` : '🗜️ Compress PDF'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
