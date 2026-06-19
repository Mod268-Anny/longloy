// API Configuration
// Automatically detects if running on localhost (dev) or mobile device

const API_URL = (() => {
  // Production deployment (Vercel) — env var set in Vercel dashboard
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const hostname = window.location.hostname;

  // Local development on computer
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }

  // If opened via ngrok, use relative URLs so Vite proxy forwards to localhost:3000
  if (hostname.includes('ngrok-free.dev') || hostname.includes('ngrok-free.app')) {
    return '';
  }

  // Mobile access via local network IP
  return `http://${hostname}:3000`;
})()

// Determine the targetAddressSpace for local network requests
const getTargetAddressSpace = () => {
  const hostname = window.location.hostname;
  
  // Localhost and loopback addresses
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return 'local';
  }
  
  // Private IP addresses (10.x.x.x, 172.16-31.x.x, 192.168.x.x, .local domains)
  if (hostname.endsWith('.local') || 
      /^10\./.test(hostname) || 
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) || 
      /^192\.168\./.test(hostname)) {
    return 'private';
  }
  
  // ngrok and other public URLs
  return undefined;
};

// Wrapper for fetch to add targetAddressSpace for local network requests
// Auto-logout when the server returns banned: true (account suspended)
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

// Centralized image URL resolver — handles http, /uploads (backend), /images, filenames
export const resolveImg = (url, fallback = '') => {
  if (!url) return fallback;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${API_URL}${url}`;
  if (url.startsWith('/')) return url;
  return `/images/${url}`;
};

export default API_URL;
