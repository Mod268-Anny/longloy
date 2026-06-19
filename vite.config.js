import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = 'http://localhost:3000';

// bypass: ถ้าเป็น browser navigation (GET + Accept: text/html) → เสิร์ฟ SPA
// ถ้าเป็น API call (fetch/XHR) → proxy ไป backend
const spaBypass = (req) => {
  if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
    return '/index.html';
  }
};

const proxy      = (ws = false) => ({ target: BACKEND, changeOrigin: true, bypass: spaBypass, proxyTimeout: 120000, timeout: 120000, ...(ws ? { ws: true } : {}) });
const uploadProxy = ()           => ({ target: BACKEND, changeOrigin: true, proxyTimeout: 120000, timeout: 120000 });
const wsProxy    = ()            => ({ target: BACKEND, changeOrigin: true, ws: true });

export default defineConfig({
  plugins: [react()],

  server: {
    allowedHosts: 'all',
    proxy: {
      '/admin':               proxy(),
      '/login':               proxy(),
      '/register':            proxy(),
      '/profile':             proxy(),
      '/user':                proxy(),
      '/user-orders':         proxy(),
      '/orders':              proxy(),
      '/shops':               proxy(),
      '/shop-orders':         proxy(),
      '/shop-sales':          proxy(),
      '/shop-reviews':        proxy(),
      '/floating-markets':    proxy(),
      '/products':            proxy(),
      '/product-reviews':     proxy(),
      '/product-detail':      proxy(),
      '/rewards':             proxy(),
      '/payments':            proxy(),
      '/market-reviews':      proxy(),
      '/cart':                proxy(),
      '/coupons':             proxy(),
      '/entrepreneur':        proxy(),
      '/add-entrepreneur':    proxy(),
      '/edit-shop':           proxy(),
      '/edit-product':        proxy(),
      '/my-shop':             proxy(),
      '/quiz':                proxy(),
      '/quests':              proxy(),
      '/upload-image':        uploadProxy(),
      '/uploads':             uploadProxy(),
      '/socket.io':           wsProxy(),
    }
  }
})
