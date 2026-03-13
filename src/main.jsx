import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '0.9rem',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        },
        success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
        error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } }
      }}
    />
  </React.StrictMode>
)
