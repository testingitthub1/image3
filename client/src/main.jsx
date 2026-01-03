import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ProcessingProvider } from './context/ProcessingContext'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ProcessingProvider>
                <App />
            </ProcessingProvider>
            <Toaster
                position="bottom-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#1e1e2e',
                        color: '#cdd6f4',
                        border: '1px solid #45475a'
                    },
                    success: {
                        iconTheme: {
                            primary: '#a6e3a1',
                            secondary: '#1e1e2e'
                        }
                    },
                    error: {
                        iconTheme: {
                            primary: '#f38ba8',
                            secondary: '#1e1e2e'
                        }
                    }
                }}
            />
        </BrowserRouter>
    </React.StrictMode>
)

