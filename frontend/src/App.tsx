import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import Layout from "./components/Layout"
import UploadPage from "./pages/UploadPage"
import PapersPage from "./pages/PapersPage"
import GraphPage from "./pages/GraphPage"
import AuthorsPage from "./pages/AuthorsPage"
import AnalysisPage from "./pages/AnalysisPage"
import HypothesisPage from "./pages/HypothesisPage"
import ReadingPathPage from "./pages/ReadingPathPage"

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/papers" element={<PapersPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/authors" element={<AuthorsPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/hypothesis" element={<HypothesisPage />} />
          <Route path="/reading-path" element={<ReadingPathPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
