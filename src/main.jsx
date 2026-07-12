// ============================================================
// main.jsx — จุดเริ่มต้นของแอป React (Entry Point)
// ทำหน้าที่: โหลด CSS ทั้งหมด แล้ว render <App /> เข้าสู่ <div id="root"> ใน index.html
// ============================================================

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'      // ฟอนต์ภาษาไทย + อังกฤษ
import './index.css'      // Global styles, CSS variables, reset
import './responsive.css' // Media queries สำหรับ mobile/tablet
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css' // Bootstrap สำหรับ grid และ utility class

// ติด React.StrictMode เพื่อช่วยตรวจหา warning ระหว่าง development
// Global image error handler: replace broken /uploads/ images with local placeholder
// This helps deployed frontend (HTTPS) where backend-hosted HTTP images may be blocked.
window.addEventListener('error', (e) => {
  const t = e.target || e.srcElement;
  try {
    if (t && t.tagName === 'IMG') {
      const src = t.getAttribute && t.getAttribute('src');
      if (!src) return;
      // If image came from backend uploads and failed, use bundled placeholder
      if (src.includes('/uploads') || src.includes('://') && src.startsWith('http://')) {
        t.onerror = null;
        t.src = '/images/market1.jpg';
      }
    }
  } catch (_) {}
}, true);
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
