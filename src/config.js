// ============================================================
// config.js — ตั้งค่ากลางของแอป (API URL + fetch helper)
// ทุกไฟล์ที่ต้องเรียก backend ให้ import API_URL จากที่นี่
// ============================================================

// ── ตรวจ environment อัตโนมัติ ────────────────────────────
// 1. Production บน Vercel → ใช้ VITE_API_URL จาก env variable
// 2. localhost → http://localhost:3000
// 3. ngrok → ใช้ relative URL (Vite proxy จัดการให้)
// 4. มือถือบน local network → http://<IP>:3000
const API_URL = (() => {
  const envApiUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envApiUrl) {
    return envApiUrl.replace(/\/$/, '');
  }

  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }

  if (hostname.includes('ngrok-free.dev') || hostname.includes('ngrok-free.app')) {
    return '';
  }

  return '';
})()

// ── ระบุ targetAddressSpace สำหรับ Private Network Access ────
// Chrome ต้องการ field นี้เมื่อเรียก local network จาก https
const getTargetAddressSpace = () => {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return 'local';
  }

  if (hostname.endsWith('.local') ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
      /^192\.168\./.test(hostname)) {
    return 'private';
  }

  return undefined;
};

// ── secureLocalFetch ─────────────────────────────────────────
// wrapper ของ fetch ที่:
//   - เติม targetAddressSpace สำหรับ local network request
//   - เติม ngrok-skip-browser-warning header เมื่อเปิดผ่าน ngrok
//   - auto-logout + redirect ไป / เมื่อ server ตอบ 403 banned: true
export const secureLocalFetch = async (url, options = {}) => {
  const isLocalNetworkRequest = url.includes('localhost:3000') || url.includes('127.0.0.1:3000');
  const isNgrok = window.location.hostname.includes('ngrok-free.dev') || window.location.hostname.includes('ngrok-free.app');

  const mergedOptions = isNgrok
    ? { ...options, headers: { 'ngrok-skip-browser-warning': 'true', ...options.headers } }
    : options;

  let res;
  if (isLocalNetworkRequest) {
    const targetAddressSpace = getTargetAddressSpace();
    res = await fetch(url, targetAddressSpace ? { ...mergedOptions, targetAddressSpace } : mergedOptions);
  } else {
    res = await fetch(url, mergedOptions);
  }

  // ถ้า server ตอบ 403 พร้อม banned: true → ล้าง token แล้ว redirect ออก
  if (res.status === 403) {
    try {
      const data = await res.clone().json();
      if (data.banned) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อแอดมิน');
        window.location.href = '/';
      }
    } catch (_) {}
  }

  return res;
};

// ── resolveImg ────────────────────────────────────────────────
// แปลง path รูปภาพที่ได้จาก DB ให้เป็น URL เต็มที่ใช้ใน <img src> ได้
//   - ถ้าเป็น http/https → ใช้ตรงๆ
//   - ถ้าเป็น /uploads/xxx → ต่อ API_URL ข้างหน้า
//   - ถ้าเป็น /images/xxx → ใช้ตรงๆ (public folder)
//   - ถ้าเป็น filename เปล่า → ต่อ /images/ ข้างหน้า
export const resolveImg = (url, fallback = '') => {
  if (!url) return fallback;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${API_URL}${url}`;
  if (url.startsWith('/')) return url;
  return `/images/${url}`;
};

export default API_URL;
