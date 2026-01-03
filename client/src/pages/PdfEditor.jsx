import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import FileUploader from '../components/FileUploader'
import { mergePdfs, splitPdf, reorderPdf, getPdfInfo, formatFileSize, downloadFile } from '../services/api'

const tabs = [
    { id: 'merge', label: '📎 Merge PDFs' },
    { id: 'split', label: '✂️ Split PDF' },
    { id: 'reorder', label: '🔀 Reorder Pages' },
]

export default function PdfEditor() {
    const [activeTab, setActiveTab] = useState('merge')
    const [files, setFiles] = useState([])
    const [singleFile, setSingleFile] = useState(null)
    const [pdfInfo, setPdfInfo] = useState(null)
    const [splitPages, setSplitPages] = useState('')
    const [pageOrder, setPageOrder] = useState([])
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState(null)

    // Merge handlers
    const handleMergeFilesSelect = useCallback((newFiles) => {
        setFiles(prev => [...prev, ...newFiles])
        setResult(null)
    }, [])

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const moveFile = (index, direction) => {
        const newFiles = [...files]
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= files.length) return
        [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]]
        setFiles(newFiles)
    }

    const handleMerge = async () => {
        if (files.length < 2) {
            toast.error('At least 2 PDFs required for merging')
            return
        }

        setUploading(true)
        setProgress(0)

        try {
            const response = await mergePdfs(files, setProgress)
            setResult({ type: 'merge', ...response })
            toast.success('PDFs merged successfully!')
        } catch (error) {
            console.error('Merge error:', error)
            toast.error(error.response?.data?.error || 'Failed to merge PDFs')
        } finally {
            setUploading(false)
        }
    }

    // Split/Reorder handlers
    const handleSingleFileSelect = useCallback(async (selectedFiles) => {
        const file = selectedFiles[0]
        setSingleFile(file)
        setResult(null)

        try {
            const info = await getPdfInfo(file)
            setPdfInfo(info)
            // Initialize page order for reorder tab
            setPageOrder(Array.from({ length: info.pageCount }, (_, i) => i + 1))
        } catch (error) {
            console.error('Error getting PDF info:', error)
            toast.error('Failed to read PDF info')
        }
    }, [])

    const handleSplit = async () => {
        if (!singleFile || !splitPages.trim()) {
            toast.error('Please specify pages to split')
            return
        }

        setUploading(true)
        setProgress(0)

        try {
            const response = await splitPdf(singleFile, splitPages, setProgress)
            setResult({ type: 'split', ...response })
            toast.success('PDF split successfully!')
        } catch (error) {
            console.error('Split error:', error)
            toast.error(error.response?.data?.error || 'Failed to split PDF')
        } finally {
            setUploading(false)
        }
    }

    const handleReorder = async () => {
        if (!singleFile || pageOrder.length === 0) return

        setUploading(true)
        setProgress(0)

        try {
            const response = await reorderPdf(singleFile, pageOrder, setProgress)
            setResult({ type: 'reorder', ...response })
            toast.success('PDF pages reordered successfully!')
        } catch (error) {
            console.error('Reorder error:', error)
            toast.error(error.response?.data?.error || 'Failed to reorder PDF')
        } finally {
            setUploading(false)
        }
    }

    const movePage = (index, direction) => {
        const newOrder = [...pageOrder]
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= pageOrder.length) return
        [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]]
        setPageOrder(newOrder)
    }

    const handleDownload = async (url, filename) => {
        try {
            await downloadFile(url, filename)
            toast.success('Download started!')
        } catch (error) {
            toast.error('Download failed')
        }
    }

    const handleReset = () => {
        setFiles([])
        setSingleFile(null)
        setPdfInfo(null)
        setSplitPages('')
        setPageOrder([])
        setResult(null)
        setProgress(0)
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">📑 PDF Editor</h1>
                <p className="page-subtitle">
                    Merge, split, or reorder PDF pages
                </p>
            </div>

            {/* Tabs */}
            <div className="tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab(tab.id)
                            handleReset()
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Merge Tab */}
            {activeTab === 'merge' && (
                <div>
                    <FileUploader
                        accept={{ 'application/pdf': ['.pdf'] }}
                        maxFiles={10}
                        onFilesSelected={handleMergeFilesSelect}
                        label="Drop PDFs here to merge"
                        hint="Select multiple PDFs in the order you want them merged"
                    />

                    {files.length > 0 && (
                        <div className="file-list">
                            {files.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="file-item">
                                    <div className="file-info">
                                        <span className="page-number">{index + 1}</span>
                                        <div>
                                            <div className="file-name">{file.name}</div>
                                            <div className="file-size">{formatFileSize(file.size)}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => moveFile(index, -1)}
                                            disabled={index === 0}
                                            style={{ padding: '0.25rem 0.5rem' }}
                                        >
                                            ↑
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => moveFile(index, 1)}
                                            disabled={index === files.length - 1}
                                            style={{ padding: '0.25rem 0.5rem' }}
                                        >
                                            ↓
                                        </button>
                                        <button className="file-remove" onClick={() => removeFile(index)}>✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {result?.type === 'merge' && (
                        <div className="result-box">
                            <div className="result-stats">
                                <div className="stat-item">
                                    <div className="stat-value">{result.filesCount}</div>
                                    <div className="stat-label">Files Merged</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{result.pageCount}</div>
                                    <div className="stat-label">Total Pages</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{formatFileSize(result.size)}</div>
                                    <div className="stat-label">Output Size</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="btn btn-success btn-lg" onClick={() => handleDownload(result.downloadUrl, 'merged.pdf')}>
                                    ⬇️ Download Merged PDF
                                </button>
                                <button className="btn btn-secondary btn-lg" onClick={handleReset}>
                                    Merge More
                                </button>
                            </div>
                        </div>
                    )}

                    {!result && files.length >= 2 && (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleMerge}
                                disabled={uploading}
                            >
                                {uploading ? `Merging... ${progress}%` : `📎 Merge ${files.length} PDFs`}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Split Tab */}
            {activeTab === 'split' && (
                <div>
                    {!singleFile ? (
                        <FileUploader
                            accept={{ 'application/pdf': ['.pdf'] }}
                            maxFiles={1}
                            onFilesSelected={handleSingleFileSelect}
                            label="Drop a PDF here to split"
                            hint="Upload a PDF and specify which pages to extract"
                        />
                    ) : (
                        <div>
                            <div className="file-list">
                                <div className="file-item">
                                    <div className="file-info">
                                        <span className="file-icon">📄</span>
                                        <div>
                                            <div className="file-name">{singleFile.name}</div>
                                            <div className="file-size">
                                                {formatFileSize(singleFile.size)} • {pdfInfo?.pageCount || '?'} pages
                                            </div>
                                        </div>
                                    </div>
                                    <button className="file-remove" onClick={handleReset}>✕</button>
                                </div>
                            </div>

                            <div className="card" style={{ marginTop: '1.5rem' }}>
                                <h3 className="control-title">Specify Pages to Extract</h3>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., 1-3;5;7-10 (semicolon creates separate PDFs)"
                                    value={splitPages}
                                    onChange={(e) => setSplitPages(e.target.value)}
                                />
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Use ranges like <code>1-5</code> or individual pages <code>3,7</code>.
                                    Separate with semicolons to create multiple PDFs.
                                </p>
                            </div>

                            {result?.type === 'split' && (
                                <div className="result-box">
                                    <p style={{ marginBottom: '1rem' }}>
                                        Created {result.splitFiles.length} PDF(s) from {result.originalPageCount} pages
                                    </p>
                                    {result.splitFiles.map((file, i) => (
                                        <div key={i} className="file-item" style={{ marginBottom: '0.5rem' }}>
                                            <div className="file-info">
                                                <span className="file-icon">📄</span>
                                                <div>
                                                    <div className="file-name">Part {i + 1}: Pages {file.pages}</div>
                                                    <div className="file-size">{file.pageCount} pages • {formatFileSize(file.size)}</div>
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-success"
                                                onClick={() => handleDownload(file.downloadUrl, `split_part${i + 1}.pdf`)}
                                            >
                                                ⬇️
                                            </button>
                                        </div>
                                    ))}
                                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                        <button className="btn btn-secondary" onClick={handleReset}>
                                            Split Another PDF
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!result && (
                                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleSplit}
                                        disabled={uploading || !splitPages.trim()}
                                    >
                                        {uploading ? `Splitting... ${progress}%` : '✂️ Split PDF'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Reorder Tab */}
            {activeTab === 'reorder' && (
                <div>
                    {!singleFile ? (
                        <FileUploader
                            accept={{ 'application/pdf': ['.pdf'] }}
                            maxFiles={1}
                            onFilesSelected={handleSingleFileSelect}
                            label="Drop a PDF here to reorder pages"
                            hint="Upload a PDF and drag pages to reorder them"
                        />
                    ) : (
                        <div>
                            <div className="file-list">
                                <div className="file-item">
                                    <div className="file-info">
                                        <span className="file-icon">📄</span>
                                        <div>
                                            <div className="file-name">{singleFile.name}</div>
                                            <div className="file-size">
                                                {formatFileSize(singleFile.size)} • {pdfInfo?.pageCount || '?'} pages
                                            </div>
                                        </div>
                                    </div>
                                    <button className="file-remove" onClick={handleReset}>✕</button>
                                </div>
                            </div>

                            <div className="card" style={{ marginTop: '1.5rem' }}>
                                <h3 className="control-title">Reorder Pages</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                    Use the arrows to change page order
                                </p>
                                <div className="pdf-pages" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                                    {pageOrder.map((page, index) => (
                                        <div key={index} className="pdf-page">
                                            <div className="page-number">{page}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Position {index + 1}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', justifyContent: 'center' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => movePage(index, -1)}
                                                    disabled={index === 0}
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                >
                                                    ←
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => movePage(index, 1)}
                                                    disabled={index === pageOrder.length - 1}
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                >
                                                    →
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {result?.type === 'reorder' && (
                                <div className="result-box">
                                    <div className="result-stats">
                                        <div className="stat-item">
                                            <div className="stat-value">{result.newPageCount}</div>
                                            <div className="stat-label">Pages</div>
                                        </div>
                                        <div className="stat-item">
                                            <div className="stat-value">{formatFileSize(result.size)}</div>
                                            <div className="stat-label">Size</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                        <button className="btn btn-success btn-lg" onClick={() => handleDownload(result.downloadUrl, 'reordered.pdf')}>
                                            ⬇️ Download Reordered PDF
                                        </button>
                                        <button className="btn btn-secondary btn-lg" onClick={handleReset}>
                                            Reorder Another
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!result && (
                                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleReorder}
                                        disabled={uploading}
                                    >
                                        {uploading ? `Processing... ${progress}%` : '🔀 Apply New Order'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
