import { useState, useCallback, useRef, useEffect } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import toast from 'react-hot-toast'
import FileUploader from '../components/FileUploader'
import { formatFileSize } from '../services/api'
import { useProcessing } from '../context/ProcessingContext'

const qualityOptions = [
    { value: 'low', label: 'Low', description: '~30%' },
    { value: 'medium', label: 'Medium', description: '~60%' },
    { value: 'high', label: 'High', description: '~80%' },
]

const formatOptions = [
    { value: 'auto', label: 'Auto', icon: '🔄' },
    { value: 'jpg', label: 'JPG', icon: '📷' },
    { value: 'png', label: 'PNG', icon: '🎨' },
    { value: 'webp', label: 'WebP', icon: '🌐' },
]

const aspectRatios = [
    { label: 'Free', value: null },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
]

export default function ImageCompressor() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)

    // Compression options
    const [quality, setQuality] = useState('medium')
    const [customQuality, setCustomQuality] = useState(60)
    const [useCustom, setUseCustom] = useState(false)

    // Format conversion
    const [targetFormat, setTargetFormat] = useState('auto')

    // Edit options
    const [showEditOptions, setShowEditOptions] = useState(false)
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
    const [isLargeFile, setIsLargeFile] = useState(false)
    const imgRef = useRef(null)

    // Get global processing context
    const { isProcessing, result: globalResult, startProcessing, handleDownload: globalDownload, clearResult } = useProcessing()

    // Warn before closing/refreshing tab during upload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (uploading) {
                e.preventDefault()
                e.returnValue = 'Processing in progress. Are you sure you want to leave?'
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [uploading])

    const handleFileSelect = useCallback((files) => {
        const selectedFile = files[0]
        setFile(selectedFile)
        setPreview(URL.createObjectURL(selectedFile))
        clearResult() // Clear any previous global result
        setIsLargeFile(selectedFile.size > 5 * 1024 * 1024) // > 5MB
        // Reset edit options
        setCrop(undefined)
        setCompletedCrop(null)
        setRotation(0)
        setBrightness(0)
        setContrast(0)
        setResizeWidth('')
        setResizeHeight('')
    }, [])

    const handleProcess = async () => {
        if (!file) return

        // Build transformations object
        const transformations = {}

        // Add quality/compression
        const qualityValue = useCustom ? customQuality :
            quality === 'low' ? 30 : quality === 'medium' ? 60 : 80
        transformations.quality = qualityValue

        // Add format if not auto
        if (targetFormat !== 'auto') {
            transformations.format = targetFormat
        }

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

        // Use global processing (persists across navigation)
        startProcessing(file, transformations)

        // Show feedback that processing started
        toast.success('Processing started! You can navigate away - check the floating indicator.')
    }

    const handleReset = () => {
        setFile(null)
        setPreview(null)
        setProgress(0)
        setShowEditOptions(false)
        setCrop(undefined)
        setCompletedCrop(null)
        setRotation(0)
        setBrightness(0)
        setContrast(0)
        setResizeWidth('')
        setResizeHeight('')
    }

    const getOriginalFormat = () => {
        if (!file) return ''
        return file.name.split('.').pop().toUpperCase()
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">🖼️ Image Processor</h1>
                <p className="page-subtitle">
                    Compress, convert format, and edit — all in one place
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
                                    <div className="file-size">{formatFileSize(file.size)} • {getOriginalFormat()}</div>
                                </div>
                            </div>
                            <button className="file-remove" onClick={handleReset}>✕</button>
                        </div>
                    </div>

                    {isLargeFile && (
                        <div className="message message-warning" style={{ marginTop: '1rem' }}>
                            ⏳ Large file detected ({formatFileSize(file.size)}). Processing may take 1-2 minutes. Please be patient.
                        </div>
                    )}

                    <div className={`processor-layout ${showEditOptions ? 'with-sidebar' : ''}`}>
                        {/* Main Controls */}
                        <div>
                            {/* Compression Level */}
                            <div className="card">
                                <h3 className="control-title">🗜️ Compression Level</h3>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                        <input type="radio" checked={!useCustom} onChange={() => setUseCustom(false)} />
                                        Presets
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                        <input type="radio" checked={useCustom} onChange={() => setUseCustom(true)} />
                                        Custom
                                    </label>
                                </div>
                                {!useCustom ? (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {qualityOptions.map(option => (
                                            <button
                                                key={option.value}
                                                className={`aspect-btn ${quality === option.value ? 'active' : ''}`}
                                                onClick={() => setQuality(option.value)}
                                                style={{ flex: 1, textAlign: 'center', padding: '0.75rem' }}
                                            >
                                                <div style={{ fontWeight: 600 }}>{option.label}</div>
                                                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{option.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="slider-container">
                                        <input
                                            type="range" min="1" max="100"
                                            value={customQuality}
                                            onChange={(e) => setCustomQuality(parseInt(e.target.value))}
                                            className="slider"
                                        />
                                        <div className="slider-value">{customQuality}%</div>
                                    </div>
                                )}
                            </div>

                            {/* Format Conversion */}
                            <div className="card" style={{ marginTop: '1rem' }}>
                                <h3 className="control-title">🔄 Output Format</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {formatOptions.map(option => (
                                        <button
                                            key={option.value}
                                            className={`aspect-btn ${targetFormat === option.value ? 'active' : ''}`}
                                            onClick={() => setTargetFormat(option.value)}
                                            style={{ flex: 1, textAlign: 'center', padding: '0.75rem' }}
                                        >
                                            <span style={{ fontSize: '1.2rem' }}>{option.icon}</span>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{option.label}</div>
                                        </button>
                                    ))}
                                </div>
                                {targetFormat === 'jpg' && file.type === 'image/png' && (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.5rem' }}>
                                        ⚠️ Transparency will be removed when converting to JPG
                                    </p>
                                )}
                            </div>

                            {/* Toggle Edit Options */}
                            <button
                                className={`btn ${showEditOptions ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setShowEditOptions(!showEditOptions)}
                                style={{ marginTop: '1rem', width: '100%' }}
                            >
                                ✂️ {showEditOptions ? 'Hide' : 'Show'} Edit Options (Crop, Resize, Rotate, Adjust)
                            </button>

                            {/* Preview with Crop */}
                            {showEditOptions && (
                                <div className="card" style={{ marginTop: '1rem' }}>
                                    <h3 className="control-title">Preview & Crop</h3>
                                    <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '1rem' }}>
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
                                                style={{ maxWidth: '100%', maxHeight: '350px' }}
                                            />
                                        </ReactCrop>
                                    </div>
                                </div>
                            )}

                            {/* Preview without edit */}
                            {!showEditOptions && preview && (
                                <div className="preview-container" style={{ marginTop: '1rem' }}>
                                    <div className="preview-box">
                                        <div className="preview-label">Original</div>
                                        <img src={preview} alt="Original" className="preview-image" />
                                    </div>
                                    {globalResult && (
                                        <div className="preview-box">
                                            <div className="preview-label">Processed</div>
                                            <img src={globalResult.downloadUrl} alt="Processed" className="preview-image" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Edit Controls Sidebar */}
                        {showEditOptions && (
                            <div className="processor-sidebar">
                                {/* Aspect Ratio */}
                                <div className="card">
                                    <h4 className="control-title" style={{ fontSize: '0.875rem' }}>Crop Ratio</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                        {aspectRatios.map(ar => (
                                            <button
                                                key={ar.label}
                                                className={`aspect-btn ${aspectRatio === ar.value ? 'active' : ''}`}
                                                onClick={() => { setAspectRatio(ar.value); setCrop(undefined) }}
                                                style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                                            >
                                                {ar.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Resize */}
                                <div className="card">
                                    <h4 className="control-title" style={{ fontSize: '0.875rem' }}>Resize (px)</h4>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input
                                            type="number" className="form-input" placeholder="W"
                                            value={resizeWidth} onChange={(e) => setResizeWidth(e.target.value)}
                                            style={{ width: '80px' }}
                                        />
                                        <span>×</span>
                                        <input
                                            type="number" className="form-input" placeholder="H"
                                            value={resizeHeight} onChange={(e) => setResizeHeight(e.target.value)}
                                            style={{ width: '80px' }}
                                        />
                                    </div>
                                </div>

                                {/* Rotation */}
                                <div className="card">
                                    <h4 className="control-title" style={{ fontSize: '0.875rem' }}>Rotate: {rotation}°</h4>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="aspect-btn" onClick={() => setRotation(r => r - 90)} style={{ flex: 1 }}>↺ -90°</button>
                                        <button className="aspect-btn" onClick={() => setRotation(0)} style={{ flex: 1 }}>Reset</button>
                                        <button className="aspect-btn" onClick={() => setRotation(r => r + 90)} style={{ flex: 1 }}>↻ +90°</button>
                                    </div>
                                </div>

                                {/* Brightness */}
                                <div className="card">
                                    <h4 className="control-title" style={{ fontSize: '0.875rem' }}>Brightness: {brightness > 0 ? '+' : ''}{brightness}</h4>
                                    <input
                                        type="range" min="-100" max="100" value={brightness}
                                        onChange={(e) => setBrightness(parseInt(e.target.value))}
                                        className="slider" style={{ width: '100%' }}
                                    />
                                </div>

                                {/* Contrast */}
                                <div className="card">
                                    <h4 className="control-title" style={{ fontSize: '0.875rem' }}>Contrast: {contrast > 0 ? '+' : ''}{contrast}</h4>
                                    <input
                                        type="range" min="-100" max="100" value={contrast}
                                        onChange={(e) => setContrast(parseInt(e.target.value))}
                                        className="slider" style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Result - from global state */}
                    {globalResult && (
                        <div className="result-box" style={{ marginTop: '1.5rem' }}>
                            <div className="result-stats">
                                <div className="stat-item">
                                    <div className="stat-value">{formatFileSize(globalResult.originalSize || 0)}</div>
                                    <div className="stat-label">Original</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{globalResult.originalWidth}×{globalResult.originalHeight}</div>
                                    <div className="stat-label">Dimensions</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value" style={{ color: 'var(--success)' }}>
                                        ✅ Ready
                                    </div>
                                    <div className="stat-label">Status</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="btn btn-success btn-lg" onClick={globalDownload}>
                                    ⬇️ Download Processed Image
                                </button>
                                <button className="btn btn-secondary btn-lg" onClick={() => { handleReset(); clearResult(); }}>
                                    Process Another
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Process Button */}
                    {!globalResult && !isProcessing && (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleProcess}
                            >
                                ✨ Process Image
                            </button>
                        </div>
                    )}

                    {/* Processing indicator on page */}
                    {isProcessing && (
                        <div className="message message-info" style={{ marginTop: '2rem', textAlign: 'center' }}>
                            🔄 Processing in progress... Check the floating indicator at bottom-right. You can navigate to other pages!
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
