import { createContext, useContext, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { transformImage, downloadFile } from '../services/api'

const ProcessingContext = createContext(null)

export function ProcessingProvider({ children }) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [processingFile, setProcessingFile] = useState(null)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    const startProcessing = useCallback(async (file, transformations) => {
        setIsProcessing(true)
        setProcessingFile(file)
        setProgress(0)
        setResult(null)
        setError(null)

        try {
            const response = await transformImage(file, transformations, setProgress)
            setResult(response)
            setIsProcessing(false)
            toast.success('Image processed successfully!')
            return response
        } catch (err) {
            console.error('Processing error:', err)
            setError(err.response?.data?.error || 'Failed to process image')
            setIsProcessing(false)
            toast.error(err.response?.data?.error || 'Failed to process image')
            throw err
        }
    }, [])

    const handleDownload = useCallback(async () => {
        if (result?.downloadUrl && processingFile) {
            try {
                const baseName = processingFile.name.replace(/\.[^/.]+$/, '')
                const ext = processingFile.name.split('.').pop()
                const filename = `${baseName}_processed.${ext}`
                await downloadFile(result.downloadUrl, filename)
                toast.success('Download started!')
            } catch (err) {
                toast.error('Download failed')
            }
        }
    }, [result, processingFile])

    const clearResult = useCallback(() => {
        setResult(null)
        setProcessingFile(null)
        setProgress(0)
        setError(null)
    }, [])

    return (
        <ProcessingContext.Provider value={{
            isProcessing,
            processingFile,
            progress,
            result,
            error,
            startProcessing,
            handleDownload,
            clearResult
        }}>
            {children}

            {/* Floating Progress Indicator */}
            {(isProcessing || result) && (
                <div className="floating-indicator">
                    {isProcessing ? (
                        <>
                            <div className="indicator-spinner"></div>
                            <div className="indicator-content">
                                <div className="indicator-title">Processing Image...</div>
                                <div className="indicator-progress">
                                    <div className="indicator-progress-bar" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="indicator-text">{progress}% uploaded</div>
                            </div>
                        </>
                    ) : result ? (
                        <>
                            <div className="indicator-icon">✅</div>
                            <div className="indicator-content">
                                <div className="indicator-title">Processing Complete!</div>
                                <div className="indicator-actions">
                                    <button className="indicator-btn" onClick={handleDownload}>
                                        ⬇️ Download
                                    </button>
                                    <button className="indicator-btn secondary" onClick={clearResult}>
                                        ✕
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>
            )}
        </ProcessingContext.Provider>
    )
}

export function useProcessing() {
    const context = useContext(ProcessingContext)
    if (!context) {
        throw new Error('useProcessing must be used within a ProcessingProvider')
    }
    return context
}
