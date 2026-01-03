import { Link } from 'react-router-dom'

const tools = [
    {
        path: '/compress-image',
        icon: '🖼️',
        title: 'Image Processor',
        description: 'Compress, convert format, crop, resize, rotate, and adjust brightness — all in one place.'
    },
    {
        path: '/convert-image',
        icon: '🔄',
        title: 'Image Converter',
        description: 'Convert images between JPG, PNG, and WebP formats. Preserves transparency where applicable.'
    },
    {
        path: '/edit-image',
        icon: '✂️',
        title: 'Image Editor',
        description: 'Crop, resize, rotate images. Adjust brightness and contrast. Multiple aspect ratio presets.'
    },
    {
        path: '/compress-pdf',
        icon: '📄',
        title: 'PDF Compressor',
        description: 'Reduce PDF file size while keeping text readable. Works best with image-heavy PDFs.'
    },
    {
        path: '/edit-pdf',
        icon: '📑',
        title: 'PDF Editor',
        description: 'Merge multiple PDFs, split by pages, or reorder pages. No limits on file count.'
    }
]

export default function Home() {
    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Free File Utilities</h1>
                <p className="page-subtitle">
                    Compress, convert, and edit your images and PDFs.
                    Fast, secure, and files are automatically deleted after 1 hour.
                </p>
            </div>

            <div className="tools-grid">
                {tools.map(tool => (
                    <Link key={tool.path} to={tool.path} className="tool-card">
                        <div className="tool-icon">{tool.icon}</div>
                        <h2 className="tool-title">{tool.title}</h2>
                        <p className="tool-description">{tool.description}</p>
                    </Link>
                ))}
            </div>

            <div className="card" style={{ marginTop: '3rem', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>🔒 Secure & Private</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                    Your files are processed securely using Cloudinary's infrastructure.
                    All uploaded files are automatically deleted after 1 hour.
                    We don't store or access your files beyond processing.
                </p>
            </div>
        </div>
    )
}
