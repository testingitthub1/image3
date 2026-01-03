import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'

const navLinks = [
    { path: '/compress-image', label: 'Image Tools' },
    { path: '/convert-image', label: 'Convert' },
    { path: '/edit-image', label: 'Edit' },
    { path: '/compress-pdf', label: 'PDF Compress' },
    { path: '/edit-pdf', label: 'PDF Edit' },
]

export default function Layout() {
    const location = useLocation()
    const [theme, setTheme] = useState(() => {
        // Get saved theme or default to dark
        return localStorage.getItem('theme') || 'dark'
    })

    useEffect(() => {
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    }

    return (
        <div className="layout">
            <header className="header">
                <div className="header-content">
                    <Link to="/" className="logo">
                        <div className="logo-icon">📁</div>
                        <span>FileUtils</span>
                    </Link>

                    <nav className="nav">
                        {navLinks.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                </div>
            </header>

            <main className="main-content">
                <Outlet />
            </main>

            <footer className="footer">
                <p>
                    FileUtils — Free file utilities powered by Cloudinary.
                    Files are deleted automatically after 1 hour.
                </p>
            </footer>
        </div>
    )
}
