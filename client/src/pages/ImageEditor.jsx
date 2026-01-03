import { useState, useCallback, useRef } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import toast from 'react-hot-toast'
import FileUploader from '../components/FileUploader'
import { transformImage, formatFileSize, downloadFile } from '../services/api'

const aspectRatios = [
    { label: 'Free', value: null },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:4', value: 3 / 4 },
    { label: '16:9', value: 16 / 9 },
    { label: '9:16', value: 9 / 16 },
]

export default function ImageEditor() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [crop, setCrop] = useState()
    const [completedCrop, setCompletedCrop] = useState(null)
    const [aspectRatio, setAspectRatio] = useState(null)
    const [rotation, setRotation] = useState(0)
    const [brightness, setBrightness] = useState(0)
    const [contrast, setContrast] = useState(0)
    const [resizeWidth, setResizeWidth] = useState('')
    const [resizeHeight, setResizeHeight] = useState('')
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState(null)
    const imgRef = useRef(null)

    const handleFileSelect = useCallback((files) => {
        const selectedFile = files[0]
        setFile(selectedFile)
        setPreview(URL.createObjectURL(selectedFile))
        setResult(null)
        setCrop(undefined)
        setCompletedCrop(null)
        setRotation(0)
        setBrightness(0)
        setContrast(0)
        setResizeWidth('')
        setResizeHeight('')
    }, [])

    const handleTransform = async () => {
        if (!file) return

        setUploading(true)
        setProgress(0)

        try {
            const transformations = {}

            // Add crop if defined
            if (completedCrop && imgRef.current) {
                const scaleX = imgRef.current.naturalWidth / imgRef.current.width
                const scaleY = imgRef.current.naturalHeight / imgRef.current.height
                transformations.crop = {
                    x: Math.round(completedCrop.x * scaleX),
                    y: Math.round(completedCrop.y * scaleY),
                    width: Math.round(completedCrop.width * scaleX),
                    height: Math.round(completedCrop.height * scaleY)
                }
            }

            // Add resize if defined
            if (resizeWidth || resizeHeight) {
                transformations.resize = {}
                if (resizeWidth) transformations.resize.width = parseInt(resizeWidth)
                if (resizeHeight) transformations.resize.height = parseInt(resizeHeight)
            }

            // Add rotation if not 0
            if (rotation !== 0) {
                transformations.rotate = rotation
            }

            // Add brightness if not 0
            if (brightness !== 0) {
                transformations.brightness = brightness
            }

            // Add contrast if not 0
            if (contrast !== 0) {
                transformations.contrast = contrast
            }

            const response = await transformImage(file, transformations, setProgress)
            setResult(response)
            toast.success('Image transformed successfully!')
        } catch (error) {
            console.error('Transform error:', error)
            toast.error(error.response?.data?.error || 'Failed to transform image')
        } finally {
            setUploading(false)
        }
    }

    const handleDownload = async () => {
        if (result?.downloadUrl) {
            try {
                const ext = file.name.split('.').pop()
                const baseName = file.name.replace(/\.[^/.]+$/, '')
                const filename = `${baseName}_edited.${ext}`
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
        setCrop(undefined)
        setCompletedCrop(null)
        setRotation(0)
        setBrightness(0)
        setContrast(0)
        setResizeWidth('')
        setResizeHeight('')
        setProgress(0)
    }

    const hasTransformations = completedCrop || resizeWidth || resizeHeight || rotation !== 0 || brightness !== 0 || contrast !== 0

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">✂️ Image Editor</h1>
                <p className="page-subtitle">
                    Crop, resize, rotate, and adjust brightness/contrast
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
                                    <div className="file-size">{formatFileSize(file.size)}</div>
                                </div>
                            </div>
                            <button className="file-remove" onClick={handleReset}>✕</button>
                        </div>
                    </div>

                    <div className="crop-container">
                        {/* Crop Preview */}
                        <div className="crop-preview">
                            {preview && (
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    aspect={aspectRatio}
                                    style={{
                                        filter: `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`,
                                        transform: `rotate(${rotation}deg)`
                                    }}
                                >
                                    <img
                                        ref={imgRef}
                                        src={preview}
                                        alt="Edit"
                                        style={{ maxWidth: '100%', maxHeight: '400px' }}
                                    />
                                </ReactCrop>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="crop-controls">
                            {/* Aspect Ratio */}
                            <div className="control-section">
                                <h4 className="control-title">Aspect Ratio</h4>
                                <div className="aspect-ratio-buttons">
                                    {aspectRatios.map((ar) => (
                                        <button
                                            key={ar.label}
                                            className={`aspect-btn ${aspectRatio === ar.value ? 'active' : ''}`}
                                            onClick={() => {
                                                setAspectRatio(ar.value)
                                                setCrop(undefined)
                                            }}
                                        >
                                            {ar.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Resize */}
                            <div className="control-section">
                                <h4 className="control-title">Resize</h4>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Width"
                                        value={resizeWidth}
                                        onChange={(e) => setResizeWidth(e.target.value)}
                                        style={{ width: '100px' }}
                                    />
                                    <span>×</span>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Height"
                                        value={resizeHeight}
                                        onChange={(e) => setResizeHeight(e.target.value)}
                                        style={{ width: '100px' }}
                                    />
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Leave one empty to maintain aspect ratio
                                </p>
                            </div>

                            {/* Rotation */}
                            <div className="control-section">
                                <h4 className="control-title">Rotate: {rotation}°</h4>
                                <div className="slider-container">
                                    <input
                                        type="range"
                                        min="-180"
                                        max="180"
                                        value={rotation}
                                        onChange={(e) => setRotation(parseInt(e.target.value))}
                                        className="slider"
                                    />
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setRotation(0)}
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                    >
                                        Reset
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <button
                                        className="aspect-btn"
                                        onClick={() => setRotation(r => r - 90)}
                                    >
                                        ↺ -90°
                                    </button>
                                    <button
                                        className="aspect-btn"
                                        onClick={() => setRotation(r => r + 90)}
                                    >
                                        ↻ +90°
                                    </button>
                                </div>
                            </div>

                            {/* Brightness */}
                            <div className="control-section">
                                <h4 className="control-title">Brightness: {brightness > 0 ? '+' : ''}{brightness}</h4>
                                <div className="slider-container">
                                    <input
                                        type="range"
                                        min="-100"
                                        max="100"
                                        value={brightness}
                                        onChange={(e) => setBrightness(parseInt(e.target.value))}
                                        className="slider"
                                    />
                                </div>
                            </div>

                            {/* Contrast */}
                            <div className="control-section">
                                <h4 className="control-title">Contrast: {contrast > 0 ? '+' : ''}{contrast}</h4>
                                <div className="slider-container">
                                    <input
                                        type="range"
                                        min="-100"
                                        max="100"
                                        value={contrast}
                                        onChange={(e) => setContrast(parseInt(e.target.value))}
                                        className="slider"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result */}
                    {result && (
                        <div className="result-box">
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <img
                                    src={result.downloadUrl}
                                    alt="Transformed"
                                    style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="btn btn-success btn-lg" onClick={handleDownload}>
                                    ⬇️ Download Edited Image
                                </button>
                                <button className="btn btn-secondary btn-lg" onClick={handleReset}>
                                    Edit Another
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Apply Button */}
                    {!result && (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleTransform}
                                disabled={uploading || !hasTransformations}
                            >
                                {uploading ? `Processing... ${progress}%` : '✨ Apply Transformations'}
                            </button>
                            {!hasTransformations && (
                                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                                    Select a crop area, resize, rotate, or adjust brightness/contrast
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
