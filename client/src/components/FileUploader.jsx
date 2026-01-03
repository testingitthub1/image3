import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

export default function FileUploader({
    accept,
    maxFiles = 1,
    maxSize = 20 * 1024 * 1024,
    onFilesSelected,
    uploading = false,
    progress = 0,
    label = 'Drag & drop files here, or click to select',
    hint = ''
}) {
    const onDrop = useCallback((acceptedFiles) => {
        if (onFilesSelected && acceptedFiles.length > 0) {
            onFilesSelected(acceptedFiles)
        }
    }, [onFilesSelected])

    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        onDrop,
        accept,
        maxFiles,
        maxSize,
        disabled: uploading
    })

    return (
        <div>
            <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
            >
                <input {...getInputProps()} />

                {uploading ? (
                    <div>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                        <p className="dropzone-text">Processing... {progress}%</p>
                        <div className="progress-bar" style={{ maxWidth: '300px', margin: '0 auto' }}>
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="dropzone-icon">
                            {isDragActive ? '📥' : '📤'}
                        </div>
                        <p className="dropzone-text">
                            {isDragActive ? 'Drop your files here...' : label}
                        </p>
                        {hint && <p className="dropzone-hint">{hint}</p>}
                    </>
                )}
            </div>

            {fileRejections.length > 0 && (
                <div className="message message-error" style={{ marginTop: '1rem' }}>
                    {fileRejections.map(({ file, errors }) => (
                        <div key={file.name}>
                            <strong>{file.name}</strong>: {errors.map(e => e.message).join(', ')}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
