import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/gate.css' // all styling lives in this one file
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
