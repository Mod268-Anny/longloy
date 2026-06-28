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
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
