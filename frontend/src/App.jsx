import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/common/Navbar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import RoutePlannerPage from './pages/RoutePlannerPage'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#161b22',
            color: '#e6edf3',
            border: '1px solid #21262d',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#161b22' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#161b22' } },
        }}
      />
      <Navbar />
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/route"     element={<RoutePlannerPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin"     element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
