import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import FileUploader from '../components/FileUploader'
import { convertImage, formatFileSize, downloadFile } from '../services/api'

const formatOptions = [
    { value: 'webp', label: 'WebP', description: 'Best compression, modern browsers' },
    { value: 'jpg', label: 'JPEG', description: 'Universal compatibility, no transparency' },
    { value: 'png', label: 'PNG', description: 'Lossless, supports transparency' },
]

export default function ImageConverter() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [targetFormat, setTargetFormat] = useState('webp')
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState(null)

    const handleFileSelect = useCallback((files) => {
        const selectedFile = files[0]
        setFile(selectedFile)
        setPreview(URL.createObjectURL(selectedFile))
        setResult(null)
    }, [])

    const handleConvert = async () => {
        if (!file) return

        setUploading(true)
        setProgress(0)

        try {
            const response = await convertImage(file, targetFormat, setProgress)
            setResult(response)
            toast.success(`Image converted to ${targetFormat.toUpperCase()}!`)
        } catch (error) {
            console.error('Conversion error:', error)
            toast.error(error.response?.data?.error || 'Failed to convert image')
        } finally {
            setUploading(false)
        }
    }

    const handleDownload = async () => {
        if (result?.downloadUrl) {
            try {
                const baseName = file.name.replace(/\.[^/.]+$/, '')
                const filename = `${baseName}_converted.${result.targetFormat}`
                await downloadFile(result.downloadUrl, filename)
                toast.success('Download started!')
            } catch (error) {
                toast.error('Download failed')
            }
        }
    }

    const handleReset = () => {
        setFile(null)
        setPreview(null)
        setResult(null)
        setProgress(0)
    }

    const getOriginalFormat = () => {
        if (!file) return ''
        const ext = file.name.split('.').pop().toLowerCase()
        return ext === 'jpg' ? 'JPEG' : ext.toUpperCase()
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">🔄 Image Converter</h1>
                <p className="page-subtitle">
                    Convert images between JPG, PNG, and WebP formats
                </p>
            </div>

            {!file ? (
                <FileUploader
                    accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] }}
                    maxFiles={1}
                    onFilesSelected={handleFileSelect}
                    label="Drop your image here, or click to select"
                    hint="Supports JPG, PNG, WebP, GIF • Max 20MB"
                />
            ) : (
                <div>
                    {/* File Info */}
                    <div className="file-list">
                        <div className="file-item">
                            <div className="file-info">
                                <span className="file-icon">🖼️</span>
                                <div>
                                    <div className="file-name">{file.name}</div>
                                    <div className="file-size">
                                        {formatFileSize(file.size)} • {getOriginalFormat()}
                                    </div>
                                </div>
                            </div>
                            <button className="file-remove" onClick={handleReset}>✕</button>
                        </div>
                    </div>

                    {/* Format Selection */}
                    <div className="card" style={{ marginTop: '1.5rem' }}>
                        <h3 className="control-title">Convert To</h3>
                        <div className="aspect-ratio-buttons" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            {formatOptions.map(option => (
                                <button
                                    key={option.value}
                                    className={`aspect-btn ${targetFormat === option.value ? 'active' : ''}`}
                                    onClick={() => setTargetFormat(option.value)}
                                    style={{ textAlign: 'center', padding: '1.5rem 1rem' }}
                                >
                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                                        {option.value === 'webp' ? '🌐' : option.value === 'jpg' ? '📷' : '🎨'}
                                    </div>
                                    <div style={{ fontWeight: 600 }}>{option.label}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
                                        {option.description}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {targetFormat === 'jpg' && file.type === 'image/png' && (
                            <div className="message message-warning" style={{ marginTop: '1rem' }}>
                                ⚠️ Converting PNG to JPG will remove transparency. The transparent areas will become white.
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    {preview && (
                        <div className="preview-container">
                            <div className="preview-box">
                                <div className="preview-label">Original ({getOriginalFormat()})</div>
                                <img src={preview} alt="Original" className="preview-image" />
                            </div>
                            {result && (
                                <div className="preview-box">
                                    <div className="preview-label">Converted ({result.targetFormat.toUpperCase()})</div>
                                    <img src={result.downloadUrl} alt="Converted" className="preview-image" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="result-box">
                            <div className="result-stats">
                                <div className="stat-item">
                                    <div className="stat-value">{result.originalFormat.toUpperCase()}</div>
                                    <div className="stat-label">Original Format</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value" style={{ color: 'var(--success)' }}>
                                        {result.targetFormat.toUpperCase()}
                                    </div>
                                    <div className="stat-label">New Format</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{result.width}×{result.height}</div>
                                    <div className="stat-label">Dimensions</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="btn btn-success btn-lg" onClick={handleDownload}>
                                    ⬇️ Download {result.targetFormat.toUpperCase()}
                                </button>
                                <button className="btn btn-secondary btn-lg" onClick={handleReset}>
                                    Convert Another
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Convert Button */}
                    {!result && (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleConvert}
                                disabled={uploading}
                            >
                                {uploading ? `Converting... ${progress}%` : `🔄 Convert to ${targetFormat.toUpperCase()}`}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
