import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import ImageCompressor from './pages/ImageCompressor'
import ImageConverter from './pages/ImageConverter'
import ImageEditor from './pages/ImageEditor'
import PdfCompressor from './pages/PdfCompressor'
import PdfEditor from './pages/PdfEditor'

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="compress-image" element={<ImageCompressor />} />
                <Route path="convert-image" element={<ImageConverter />} />
                <Route path="edit-image" element={<ImageEditor />} />
                <Route path="compress-pdf" element={<PdfCompressor />} />
                <Route path="edit-pdf" element={<PdfEditor />} />
            </Route>
        </Routes>
    )
}

export default App
