
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import 'leaflet/dist/leaflet.css'
import './index.css'

// Remove dark mode class addition
createRoot(document.getElementById("root")!).render(<App />);
