// ============================================================
// EntrepreneurDashboard.jsx — แดชบอร์ดผู้ประกอบการ
//
// หน้าที่: หน้าหลักสำหรับเจ้าของร้านค้า จัดการออเดอร์ สินค้า และดูยอดขาย
//
// แท็บที่มี:
//   - orders   → ดูและอัปเดตสถานะออเดอร์ (AwaitingPayment → Cooking → Completed)
//   - products → เพิ่ม / แก้ไข / ลบสินค้า พร้อมอัปโหลดรูปภาพ
//   - sales    → ยอดขายรายเดือน + กราฟบาร์รายวัน
//   - shop     → ดูและแก้ไขข้อมูลร้านค้า / เปิด-ปิดร้าน
//
// สำหรับ: เส้นทาง /entrepreneur-dashboard (ต้องล็อกอินและมีสิทธิ์ entrepreneur)
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';
import Footer from './Footer';
import API_URL, { secureLocalFetch, resolveImg } from './config';
import useCartCount from './useCartCount';

/* ── nav ──────────────────────────────────────────────────────── */
const NAV = [
  { label:'หน้าแรก',  icon:<MdHome size={18}/>,                path:'/homepage' },
  { label:'ตลาดน้ำ',  icon:<MdStorefront size={18}/>,           path:'/market'   },
  { label:'เกม',      icon:<MdOutlineSportsEsports size={18}/>, path:'/game'     },
  { label:'ช่วยเหลือ',icon:<MdHelpOutline size={18}/>,          path:'/help'     },
];

/* ── constants ────────────────────────────────────────────────── */
const STATUS_CFG = {
  AwaitingPayment: { label:'รอชำระเงิน',   bg:'#fdf4ff', border:'#e9d5ff', color:'#6b21a8', dot:'#a855f7' },
  Pending:         { label:'รอยืนยัน',     bg:'#fff0db', border:'#e8b895', color:'#5c2c08', dot:'#8d4d11' },
  Cooking:         { label:'กำลังเตรียม',  bg:'#e0ecfd', border:'#93c5fd', color:'#1a3a6e', dot:'#4b8ff4' },
  Completed:       { label:'เสร็จแล้ว',   bg:'#f0fdf4', border:'#bbf7d0', color:'#166534', dot:'#22c55e' },
  Cancelled:       { label:'ยกเลิก',      bg:'#fef2f2', border:'#fecaca', color:'#991b1b', dot:'#ef4444' },
};
const fmt  = n => `฿${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
const fmtD = d => new Date(d).toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' });
const token = () => localStorage.getItem('token') || '';
const authH = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${token()}` });

/* ══════════════════════════════════════════════════════════════ */
export default function EntrepreneurDashboard() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const cartCount = useCartCount();

  const [shops,        setShops]        = useState([]);
  const [shopId,       setShopId]       = useState(null);
  const [orders,       setOrders]       = useState([]);
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('orders');

  // sales tab
  const nowD = new Date();
  const [salesMonth, setSalesMonth] = useState(`${nowD.getFullYear()}-${String(nowD.getMonth()+1).padStart(2,'0')}`);
  const [salesData,  setSalesData]  = useState(null);
  const [salesLoading, setSalesLoading] = useState(false);
  const [orderFilter,  setOrderFilter]  = useState('all');
  const [expanded,     setExpanded]     = useState({});
  const [busy,         setBusy]         = useState(null);
  const [statusMenu,   setStatusMenu]   = useState(null);
  const [orderSearch,  setOrderSearch]  = useState('');
  const [sortDir,      setSortDir]      = useState('desc'); // 'desc' = ใหม่สุด
  const [orderPage,    setOrderPage]    = useState(1);
  const PAGE_SIZE = 10;

  /* product form */
  const UNITS = ['ชิ้น', 'กก.', 'กรัม', 'ลิตร', 'มล.', 'ขวด', 'ถุง', 'กล่อง', 'จาน', 'ชาม', 'แก้ว', 'อัน', 'ชุด', 'โหล'];
  const emptySize = { size_name: '', price_adjustment: 0 };
  const emptyForm = { name:'', price:'', image_url:'', is_available:1, unit:'', description:'', sizes:[] };
  const [productSearch, setProductSearch] = useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [togglingId,   setTogglingId]   = useState(null);
  const [editId,       setEditId]       = useState(null);
  const [form,         setForm]         = useState(emptyForm);
  const [imageMode,    setImageMode]    = useState('url');
  const [imgPreview,   setImgPreview]   = useState('');
  const [saving,       setSaving]       = useState(false);
  const [formErr,      setFormErr]      = useState('');

  /* ── fetch shops ─────────────────────────────────────────────── */
  useEffect(() => {
    secureLocalFetch(`${API_URL}/entrepreneur/my-shops`, { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d) && d.length) {
          setShops(d);
          setShopId(d[0].shop_id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ── fetch orders ────────────────────────────────────────────── */
  const fetchOrders = useCallback(() => {
    if (!shopId) return;
    fetch(`${API_URL}/shop-orders/${shopId}`, { headers: { Authorization:`Bearer ${token()}` } })
      .then(r => r.json())
      .then(raw => {
        const grouped = {};
        (Array.isArray(raw) ? raw : []).forEach(row => {
          if (!grouped[row.order_id]) {
            grouped[row.order_id] = { ...row, items: [] };
          }
          if (row.product_name) {
            grouped[row.order_id].items.push({ name:row.product_name, qty:row.quantity, price:row.price });
          }
        });
        setOrders(Object.values(grouped));
      })
      .catch(() => {});
  }, [shopId]);

  /* ── fetch products ──────────────────────────────────────────── */
  const fetchProducts = useCallback(() => {
    if (!shopId) return;
    secureLocalFetch(`${API_URL}/products/by-shop/${shopId}`)
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [shopId]);

  useEffect(() => { fetchOrders(); fetchProducts(); }, [shopId]);

  const fetchSales = async (sid, ym) => {
    if (!sid) return;
    const [y, m] = ym.split('-');
    setSalesLoading(true);
    try {
      const r = await secureLocalFetch(`${API_URL}/shop-sales/${sid}?year=${y}&month=${m}`, { headers: authH() });
      const d = await r.json();
      setSalesData(r.ok ? d : null);
    } catch { setSalesData(null); }
    setSalesLoading(false);
  };

  useEffect(() => { if (tab === 'sales') fetchSales(shopId, salesMonth); }, [tab, shopId, salesMonth]);
  useEffect(() => {
    const iv = setInterval(fetchOrders, 15000);
    return () => clearInterval(iv);
  }, [fetchOrders]);

  /* ── order status update ─────────────────────────────────────── */
  const updateStatus = async (orderId, newStatus) => {
    setBusy(orderId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method:'PUT', headers: authH(), body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchOrders();
      else alert('ไม่สามารถอัปเดตสถานะได้');
    } catch { alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
    finally { setBusy(null); }
  };

  /* ── confirm payment (entrepreneur manually confirms cash/QR) ── */
  const confirmPayment = async (orderId) => {
    setBusy(orderId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/confirm-payment`, {
        method:'POST', headers: authH(), body: JSON.stringify({ payment_method: 'cash' }),
      });
      if (res.ok) fetchOrders();
      else {
        const d = await res.json();
        alert(d.error || 'ยืนยันชำระเงินไม่สำเร็จ');
      }
    } catch { alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
    finally { setBusy(null); }
  };

  /* ── compress + upload image ─────────────────────────────────── */
  const handleFile = async (file) => {
    const compressed = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          const maxW = 1280;
          if (width > maxW) { height = Math.round((height * maxW) / width); width = maxW; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
    setImgPreview(compressed);
    const res = await fetch(`${API_URL}/upload-image`, {
      method: 'POST', headers: authH(),
      body: JSON.stringify({ image: compressed, prefix: 'product' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.url) throw new Error(data.error || 'Upload failed');
    setForm(f => ({ ...f, image_url: data.url }));
    setImgPreview(data.url);
    return data.url;
  };

  /* ── save product ────────────────────────────────────────────── */
  const saveProduct = async () => {
    if (!form.name.trim()) { setFormErr('กรุณากรอกชื่อสินค้า'); return; }
    if (!form.price || isNaN(form.price)) { setFormErr('กรุณากรอกราคา'); return; }
    const validSizes = (form.sizes || []).filter(s => s.size_name?.trim());
    if (validSizes.length > 5) { setFormErr('ขนาดสินค้าได้สูงสุด 5 รายการ'); return; }
    setSaving(true); setFormErr('');
    try {
      const body = {
        ...form,
        price: parseFloat(form.price),
        sizes: validSizes,
        unit: form.unit || null,
        description: form.description || null,
      };
      let res;
      if (editId) {
        res = await fetch(`${API_URL}/products/update/${editId}`, {
          method:'PUT', headers: authH(), body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${API_URL}/products/add`, {
          method:'POST', headers: authH(), body: JSON.stringify({ ...body, shop_id: shopId }),
        });
      }
      if (res.ok) { fetchProducts(); setShowForm(false); setEditId(null); setForm(emptyForm); setImgPreview(''); }
      else { const d = await res.json(); setFormErr(d.error || 'บันทึกไม่สำเร็จ'); }
    } catch { setFormErr('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
    finally { setSaving(false); }
  };

  /* ── delete product ──────────────────────────────────────────── */
  const deleteProduct = async (pid) => {
    if (!window.confirm('ยืนยันลบสินค้านี้?')) return;
    await fetch(`${API_URL}/products/${pid}`, { method:'DELETE', headers: authH() });
    fetchProducts();
  };

  /* ── open edit form ──────────────────────────────────────────── */
  const openEdit = (p) => {
    setEditId(p.product_id);
    setForm({
      name:        p.name,
      price:       p.price,
      image_url:   p.image_url || '',
      is_available:p.is_available,
      unit:        p.unit || '',
      description: p.description || '',
      sizes:       Array.isArray(p.sizes) ? p.sizes.map(s => ({ size_name: s.size_name, price_adjustment: s.price_adjustment })) : [],
    });
    setImgPreview(p.image_url || '');
    setImageMode('url');
    setShowForm(true);
    setFormErr('');
    setTimeout(() => { document.getElementById('product-form-top')?.scrollIntoView({ behavior:'smooth' }); }, 100);
  };

  /* ── derived ─────────────────────────────────────────────────── */
  const shop        = shops.find(s => s.shop_id === shopId);
  const awaitingCnt = orders.filter(o => o.status === 'AwaitingPayment').length;
  const pendingCnt  = orders.filter(o => o.status === 'Pending').length;
  const cookingCnt  = orders.filter(o => o.status === 'Cooking').length;
  const doneCnt     = orders.filter(o => o.status === 'Completed').length;
  const urgentCnt   = awaitingCnt + pendingCnt;

  const q = orderSearch.trim().toLowerCase();
  const filteredOrders = orders
    .filter(o => orderFilter === 'all' || o.status === orderFilter)
    .filter(o => !q || String(o.order_id).includes(q) || (o.customer_name || '').toLowerCase().includes(q) ||
      (o.items || []).some(i => i.name?.toLowerCase().includes(q)))
    .sort((a, b) => {
      const diff = new Date(a.created_at) - new Date(b.created_at);
      return sortDir === 'desc' ? -diff : diff;
    });

  const totalPages  = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const visOrders   = filteredOrders.slice((orderPage - 1) * PAGE_SIZE, orderPage * PAGE_SIZE);

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontSize:15, color:'#94a3b8' }}>⏳ กำลังโหลด...</div>;

  if (!shops.length) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:16 }}>
      <p style={{ fontSize:48 }}>🏪</p>
      <p style={{ color:'#64748b' }}>คุณยังไม่มีร้านค้า</p>
      <button onClick={() => navigate('/addshop')} style={{ padding:'10px 24px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4b8ff4,#4b8ff4)', color:'#fff', fontWeight:700, cursor:'pointer' }}>
        + เพิ่มร้านค้า
      </button>
    </div>
  );

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:'#f8fafc', minHeight:'100vh', overflowX:'hidden' }}>

      {/* Navbar */}
      <header style={{ position:'sticky', top:0, zIndex:50, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid #e2e8f0', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="rsp-header-inner" style={{ maxWidth:1280, margin:'0 auto', padding:'0 24px', height:68, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
          <button onClick={() => navigate('/homepage')} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height:45, objectFit:'contain' }} />
          </button>
          <nav style={{ display:'flex', gap:4 }}>
            {NAV.map(n => {
              const active = location.pathname === n.path;
              return <button key={n.label} onClick={() => navigate(n.path)} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:14, fontWeight:active?600:400, background:active?'#edf3ff':'transparent', color:active?'#4b8ff4':'#475569' }}>{n.icon} <span className="rsp-nav-label">{n.label}</span></button>;
            })}
          </nav>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => navigate('/cart')} style={{ width:40, height:40, borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              <i className="fas fa-basket-shopping" style={{ fontSize:17 }} />
              {cartCount > 0 && <span style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', background:'#ef4444', color:'#fff', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{cartCount}</span>}
            </button>
            <button onClick={() => navigate('/profile')} style={{ width:40, height:40, borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="fas fa-user-circle" style={{ fontSize:18 }} />
            </button>
          </div>
        </div>
      </header>

      <main className="rsp-main" style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px 80px' }}>

        {/* Shop selector */}
        {shops.length > 1 && (
          <div style={{ marginBottom:20 }}>
            <p style={{ margin:'0 0 8px', fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>เลือกร้านค้า ({shops.length} ร้าน)</p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {shops.map(s => {
                const active = shopId === s.shop_id;
                const isOpen = s.status === 'Open';
                return (
                  <div key={s.shop_id} style={{
                    padding:'8px 12px', borderRadius:12, border:'1.5px solid', textAlign:'left',
                    borderColor: active ? '#4b8ff4' : '#e2e8f0',
                    background: active ? '#edf3ff' : '#fff',
                    boxShadow: active ? '0 2px 8px rgba(75,143,244,0.15)' : 'none',
                    display:'flex', alignItems:'center', gap:10,
                  }}>
                    {/* ส่วนเลือกร้าน */}
                    <button onClick={() => setShopId(s.shop_id)} style={{
                      background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0,
                      color: active ? '#4b8ff4' : '#475569',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:13, fontWeight:700 }}>{s.shop_name}</span>
                        {s.pending_count > 0 && <span style={{ background:'#8d4d11', color:'#fff', borderRadius:999, padding:'1px 7px', fontSize:11, fontWeight:700 }}>{s.pending_count}</span>}
                      </div>
                      {s.market_name && (
                        <div style={{ fontSize:11, color: active ? '#4b8ff4' : '#94a3b8', marginTop:2, fontWeight:500 }}>
                          📍 {s.market_name}
                        </div>
                      )}
                    </button>
                    {/* dot สถานะ */}
                    <span style={{
                      width:10, height:10, borderRadius:'50%', flexShrink:0,
                      background: isOpen ? '#22c55e' : '#ef4444',
                      boxShadow: isOpen ? '0 0 0 3px rgba(34,197,94,0.2)' : '0 0 0 3px rgba(239,68,68,0.2)',
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dashboard header */}
        <div className="rsp-dash-header rsp-flex-row" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#0f172a' }}>{shop?.shop_name || 'Dashboard'}</h1>
              {/* Toggle switch เปิด/ปิดร้าน */}
              {shop && (
                <button
                  disabled={togglingId === shopId}
                  onClick={async () => {
                    setTogglingId(shopId);
                    try {
                      const res = await secureLocalFetch(`${API_URL}/entrepreneur/shop-status/${shopId}`, { method:'PUT', headers:authH() });
                      if (res.ok) {
                        const data = await res.json();
                        setShops(prev => prev.map(s => s.shop_id === shopId ? { ...s, status: data.status } : s));
                      }
                    } finally { setTogglingId(null); }
                  }}
                  title={shop.status === 'Open' ? 'คลิกเพื่อปิดร้าน' : 'คลิกเพื่อเปิดร้าน'}
                  style={{
                    position:'relative', width:52, height:28, borderRadius:999, border:'none',
                    background: togglingId === shopId ? '#e2e8f0' : shop.status === 'Open' ? '#22c55e' : '#cbd5e1',
                    cursor: togglingId === shopId ? 'wait' : 'pointer',
                    transition:'background 0.25s', flexShrink:0, padding:0,
                    boxShadow: shop.status === 'Open' ? '0 2px 8px rgba(34,197,94,0.4)' : 'inset 0 1px 3px rgba(0,0,0,0.15)',
                  }}
                >
                  <span style={{
                    position:'absolute', top:3,
                    left: shop.status === 'Open' ? 27 : 3,
                    width:22, height:22, borderRadius:'50%', background:'#fff',
                    boxShadow:'0 1px 4px rgba(0,0,0,0.2)',
                    transition:'left 0.25s',
                  }} />
                </button>
              )}
              {shop && (
                <span style={{ fontSize:12, fontWeight:700, color: shop.status === 'Open' ? '#16a34a' : '#64748b' }}>
                  {togglingId === shopId ? '...' : shop.status === 'Open' ? 'เปิดอยู่' : 'ปิดอยู่'}
                </span>
              )}
            </div>
            <p style={{ margin:'3px 0 0', fontSize:13, color:'#64748b' }}>{shop?.market_name} · {shop?.open_time?.slice(0,5)} – {shop?.close_time?.slice(0,5)}</p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {urgentCnt > 0 && (
              <div className="rsp-hide-mobile" style={{ background:'#fdf4ff', border:'1px solid #e9d5ff', borderRadius:10, padding:'6px 14px', fontSize:13, fontWeight:700, color:'#6b21a8' }}>
                ⚡ {urgentCnt} ออเดอร์รอดำเนินการ
              </div>
            )}
            <button onClick={() => navigate('/addshop')} style={{ padding:'8px 16px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4b8ff4,#2d6fd4)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              + เพิ่มร้านค้า
            </button>
            <button onClick={() => { fetchOrders(); fetchProducts(); }} style={{ padding:'8px 14px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4b8ff4,#4b8ff4)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              🔄 รีเฟรช
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="rsp-tabs" style={{ display:'flex', gap:2, marginBottom:24, background:'#f1f5f9', borderRadius:12, padding:4, maxWidth:'100%', overflowX:'auto' }}>
          {[
            { key:'orders',   label:`จัดการออเดอร์`, badge:orders.length },
            { key:'products', label:`จัดการสินค้า`,  badge:products.length },
            { key:'sales',    label:`ยอดขาย`,        badge:null },
            { key:'shop',     label:`ข้อมูลร้านค้า`,  badge:null },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:'8px 20px', borderRadius:10, border:'none', cursor:'pointer', fontSize:14, fontWeight:600,
              background: tab===t.key ? '#fff' : 'transparent',
              color: tab===t.key ? '#0f172a' : '#64748b',
              boxShadow: tab===t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition:'all 0.15s', display:'flex', alignItems:'center', gap:6,
            }}>
              {t.label}
              {t.badge !== null && <span style={{ fontSize:11, background: tab===t.key?'#f1f5f9':'#e2e8f0', padding:'1px 7px', borderRadius:999, color:'#64748b' }}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* ══ TAB: ORDERS ══════════════════════════════════════════ */}
        {tab === 'orders' && (
          <>
            {/* Stats */}
            <div className="rsp-flex-row" style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
              {[
                { label:'รอชำระเงิน',  value:awaitingCnt, bg:'#fdf4ff', color:'#6b21a8' },
                { label:'รอยืนยัน',    value:pendingCnt,  bg:'#fff0db', color:'#5c2c08' },
                { label:'กำลังเตรียม', value:cookingCnt,  bg:'#e0ecfd', color:'#1a3a6e' },
                { label:'เสร็จแล้ว',  value:doneCnt,     bg:'#e0ecfd', color:'#166634' },
                { label:'ทั้งหมด',    value:orders.length,bg:'#f1f5f9', color:'#475569' },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, borderRadius:14, padding:'14px 20px', flex:'1 1 120px', textAlign:'center' }}>
                  <p style={{ margin:'0 0 4px', fontSize:11, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</p>
                  <p style={{ margin:0, fontSize:28, fontWeight:800, color:s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Search + Sort */}
            <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative', flex:1, minWidth:200 }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'#94a3b8', pointerEvents:'none' }}>🔍</span>
                <input
                  value={orderSearch}
                  onChange={e => { setOrderSearch(e.target.value); setOrderPage(1); }}
                  placeholder="ค้นหาเลขออเดอร์ ชื่อลูกค้า หรือสินค้า..."
                  style={{ width:'100%', boxSizing:'border-box', paddingLeft:38, paddingRight:12, paddingTop:9, paddingBottom:9, borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, fontFamily:'inherit', outline:'none', background:'#fff' }}
                />
                {orderSearch && (
                  <button onClick={() => { setOrderSearch(''); setOrderPage(1); }}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#94a3b8' }}>✕</button>
                )}
              </div>
              <button onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setOrderPage(1); }}
                style={{ padding:'9px 14px', borderRadius:10, border:'1.5px solid #e2e8f0', background:'#fff', fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer', whiteSpace:'nowrap' }}>
                {sortDir === 'desc' ? '↓ ใหม่สุด' : '↑ เก่าสุด'}
              </button>
            </div>

            {/* Filter */}
            <div className="rsp-tabs" style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
              {[
                ['all','ทั้งหมด'],
                ['AwaitingPayment','รอชำระเงิน'],
                ['Pending','รอยืนยัน'],
                ['Cooking','กำลังเตรียม'],
                ['Completed','เสร็จแล้ว'],
                ['Cancelled','ยกเลิก'],
              ].map(([k,l]) => (
                <button key={k} onClick={() => { setOrderFilter(k); setOrderPage(1); }} style={{
                  padding:'6px 14px', borderRadius:8, border:'1.5px solid', cursor:'pointer', fontSize:13, fontWeight:600,
                  borderColor: orderFilter===k?'#4b8ff4':'#e2e8f0',
                  background: orderFilter===k?'#edf3ff':'#fff',
                  color: orderFilter===k?'#4b8ff4':'#64748b',
                }}>{l}</button>
              ))}
            </div>

            {/* Orders list */}
            {visOrders.length === 0 ? (
              <div style={{ textAlign:'center', padding:'50px 0', background:'#fff', borderRadius:16, border:'1px solid #e2e8f0' }}>
                <p style={{ fontSize:40, margin:'0 0 10px' }}>📭</p>
                <p style={{ color:'#94a3b8', margin:0 }}>ไม่มีออเดอร์</p>
              </div>
            ) : (
              <>
              {q && (
                <p style={{ margin:'0 0 12px', fontSize:13, color:'#64748b' }}>
                  พบ <strong>{filteredOrders.length}</strong> ออเดอร์ที่ตรงกับ "<strong>{q}</strong>"
                </p>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {visOrders.map(order => {
                  const s = STATUS_CFG[order.status] || STATUS_CFG.Pending;
                  const isNew = new Date(order.created_at).getTime() > Date.now() - 300000;
                  return (
                    <div key={order.order_id} style={{ background:'#fff', borderRadius:16, border:`1.5px solid ${isNew && (order.status==='AwaitingPayment'||order.status==='Pending') ? (order.status==='AwaitingPayment'?'#e9d5ff':'#e8b895') : '#e2e8f0'}`, overflow:'hidden', boxShadow: isNew && (order.status==='AwaitingPayment'||order.status==='Pending') ? (order.status==='AwaitingPayment'?'0 2px 12px rgba(168,85,247,0.15)':'0 2px 12px rgba(141,77,17,0.15)') : '0 1px 4px rgba(0,0,0,0.05)' }}>
                      {/* Header */}
                      <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                        {/* Left: info — click to expand */}
                        <div onClick={() => setExpanded(p => ({ ...p, [order.order_id]: !p[order.order_id] }))}
                          style={{ display:'flex', alignItems:'center', gap:10, flex:'1 1 180px', minWidth:0, cursor:'pointer' }}>
                          <span style={{ width:9, height:9, borderRadius:'50%', background:s.dot, flexShrink:0 }} />
                          <div>
                            <p style={{ margin:0, fontWeight:700, fontSize:14, color:'#0f172a' }}>
                              ออเดอร์ #{order.order_id} {isNew && (order.status==='AwaitingPayment'||order.status==='Pending') ? '🔔' : ''}
                            </p>
                            <p style={{ margin:'1px 0 0', fontSize:12, color:'#64748b' }}>
                              {fmtD(order.created_at)} · {order.customer_name || 'ลูกค้า'}
                              {order.payment_method && <span style={{ marginLeft:6, padding:'1px 7px', borderRadius:6, background:'#f1f5f9', fontSize:11, fontWeight:600, color:'#475569' }}>{order.payment_method}</span>}
                            </p>
                          </div>
                        </div>

                        {/* Right: amount + status dropdown + expand */}
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                          <span style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>{fmt(order.total_amount)}</span>

                          {/* Status dropdown */}
                          {order.status !== 'Completed' && order.status !== 'Cancelled' ? (
                            <div style={{ position:'relative' }}>
                              <button
                                onClick={e => { e.stopPropagation(); setStatusMenu(statusMenu === order.order_id ? null : order.order_id); }}
                                disabled={busy === order.order_id}
                                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, border:`1.5px solid ${s.border}`, background:s.bg, color:s.color, fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                                {busy === order.order_id ? '⏳' : <><span style={{ width:7,height:7,borderRadius:'50%',background:s.dot,display:'inline-block' }}/> {s.label} ▾</>}
                              </button>

                              {statusMenu === order.order_id && (
                                <div style={{ position:'absolute', top:'110%', right:0, zIndex:200, background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', boxShadow:'0 8px 32px rgba(0,0,0,0.14)', minWidth:210, overflow:'hidden' }}>
                                  <div style={{ padding:'9px 14px', fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid #f1f5f9' }}>อัปเดตสถานะ</div>
                                  {[
                                    order.status === 'AwaitingPayment' && { key:'pay',    emoji:'💰', label:'ยืนยันรับชำระเงิน', desc:'ลูกค้าชำระเงินแล้ว → เริ่มทำ', dot:'#a855f7', color:'#6b21a8', bg:'#fdf4ff', action:()=>{ setStatusMenu(null); confirmPayment(order.order_id); } },
                                    (order.status==='AwaitingPayment'||order.status==='Pending') && { key:'cook', emoji:'👨‍🍳', label:'กำลังเตรียม/ทำ', desc:'รับออเดอร์แล้ว เริ่มเตรียม', dot:'#4b8ff4', color:'#1a3a6e', bg:'#e0ecfd', action:()=>{ setStatusMenu(null); updateStatus(order.order_id,'Cooking'); } },
                                    order.status === 'Cooking' && { key:'done', emoji:'✅', label:'เสร็จสิ้น', desc:'ส่งสินค้า/อาหารให้ลูกค้าแล้ว', dot:'#22c55e', color:'#166534', bg:'#f0fdf4', action:()=>{ setStatusMenu(null); updateStatus(order.order_id,'Completed'); } },
                                    { key:'cancel', emoji:'❌', label:'ยกเลิกออเดอร์', desc:'ยกเลิกและแจ้งลูกค้า', dot:'#8d4d11', color:'#4a2008', bg:'#ffe8d4',
                                      action:()=>{ if(window.confirm('ยืนยันยกเลิกออเดอร์ #'+order.order_id+'?')){ setStatusMenu(null); updateStatus(order.order_id,'Cancelled'); } } },
                                  ].filter(Boolean).map(item => (
                                    <button key={item.key}
                                      onClick={e => { e.stopPropagation(); item.action(); }}
                                      style={{ width:'100%', padding:'10px 14px', border:'none', borderBottom:'1px solid #f8fafc', background:'#fff', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10 }}
                                      onMouseEnter={e => e.currentTarget.style.background = item.bg}
                                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                    >
                                      <span style={{ fontSize:16 }}>{item.emoji}</span>
                                      <div>
                                        <div style={{ fontSize:13, fontWeight:700, color:item.color }}>{item.label}</div>
                                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{item.desc}</div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ padding:'4px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>{s.label}</span>
                          )}

                          <span onClick={() => { setStatusMenu(null); setExpanded(p => ({ ...p, [order.order_id]: !p[order.order_id] })); }}
                            style={{ fontSize:11, color:'#94a3b8', cursor:'pointer', padding:'4px 2px' }}>
                            {expanded[order.order_id]?'▲':'▼'}
                          </span>
                        </div>
                      </div>

                      {/* Detail */}
                      {expanded[order.order_id] && (
                        <div style={{ borderTop:'1px solid #f1f5f9', padding:'14px 18px 18px' }}>
                          {/* Items */}
                          {order.items?.length > 0 && (
                            <div style={{ marginBottom:14, background:'#f8fafc', borderRadius:10, padding:'12px 14px' }}>
                              <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>รายการสินค้า</p>
                              {order.items.map((item, i) => (
                                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:14, padding:'4px 0', borderBottom:'1px dashed #e2e8f0' }}>
                                  <span style={{ color:'#334155' }}>{item.name} × {item.qty}</span>
                                  <span style={{ fontWeight:600 }}>{fmt((item.price||0) * (item.qty||1))}</span>
                                </div>
                              ))}
                              <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:15, paddingTop:8 }}>
                                <span>รวม</span>
                                <span style={{ color:'#4b8ff4' }}>{fmt(order.total_amount)}</span>
                              </div>
                            </div>
                          )}

                          {order.notes && (
                            <div style={{ padding:'8px 12px', background:'#fff8f0', borderLeft:'3px solid #8d4d11', borderRadius:8, fontSize:13, color:'#5c2c08', marginBottom:12 }}>
                              📝 หมายเหตุ: {order.notes}
                            </div>
                          )}

                          {/* Action buttons by status */}
                          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                            {order.status === 'AwaitingPayment' && (
                              <>
                                <button onClick={() => confirmPayment(order.order_id)} disabled={busy===order.order_id}
                                  style={{ flex:1, padding:'10px 0', borderRadius:10, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', background:'linear-gradient(135deg,#a855f7,#7c3aed)', color:'#fff' }}>
                                  {busy===order.order_id ? '⏳...' : '💰 ยืนยันรับชำระเงิน → เริ่มทำ'}
                                </button>
                                <button onClick={() => updateStatus(order.order_id, 'Cancelled')} disabled={busy===order.order_id}
                                  style={{ padding:'10px 16px', borderRadius:10, border:'1px solid #e8b895', fontSize:13, fontWeight:700, cursor:'pointer', background:'#fff0e8', color:'#6b3a0d' }}>
                                  ยกเลิก
                                </button>
                              </>
                            )}
                            {order.status === 'Pending' && (
                              <>
                                <button onClick={() => updateStatus(order.order_id, 'Cooking')} disabled={busy===order.order_id}
                                  style={{ flex:1, padding:'10px 0', borderRadius:10, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', background:'#e0ecfd', color:'#1a3a6e' }}>
                                  {busy===order.order_id ? '⏳...' : '👨‍🍳 รับออเดอร์ / กำลังเตรียม'}
                                </button>
                                <button onClick={() => updateStatus(order.order_id, 'Cancelled')} disabled={busy===order.order_id}
                                  style={{ padding:'10px 16px', borderRadius:10, border:'1px solid #e8b895', fontSize:13, fontWeight:700, cursor:'pointer', background:'#fff0e8', color:'#6b3a0d' }}>
                                  ยกเลิก
                                </button>
                              </>
                            )}
                            {order.status === 'Cooking' && (
                              <button onClick={() => updateStatus(order.order_id, 'Completed')} disabled={busy===order.order_id}
                                style={{ flex:1, padding:'10px 0', borderRadius:10, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', background:'#e0ecfd', color:'#166634' }}>
                                {busy===order.order_id ? '⏳...' : '✅ เสร็จสิ้น / ส่งของให้ลูกค้า'}
                              </button>
                            )}
                            {(order.status === 'Completed' || order.status === 'Cancelled') && (
                              <div style={{ fontSize:13, color:'#94a3b8', padding:'10px 0' }}>
                                {order.status === 'Completed' ? '✅ ออเดอร์นี้เสร็จสิ้นแล้ว' : '❌ ออเดอร์ถูกยกเลิก'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:20 }}>
                  <button onClick={() => setOrderPage(p => Math.max(1, p-1))} disabled={orderPage === 1}
                    style={{ width:32, height:32, borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:orderPage===1?'not-allowed':'pointer', color:orderPage===1?'#cbd5e1':'#475569', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                    const show = p === 1 || p === totalPages || Math.abs(p - orderPage) <= 1;
                    const dotBefore = p === 2 && orderPage > 3;
                    const dotAfter  = p === totalPages - 1 && orderPage < totalPages - 2;
                    return (
                      <React.Fragment key={p}>
                        {dotBefore && <span style={{ color:'#cbd5e1', fontWeight:700 }}>•••</span>}
                        {show && (
                          <button onClick={() => setOrderPage(p)}
                            style={{ width:32, height:32, borderRadius:8, border: p===orderPage?'none':'1px solid #e2e8f0', background:p===orderPage?'#4b8ff4':'#fff', color:p===orderPage?'#fff':'#475569', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:p===orderPage?'0 3px 10px rgba(75,143,244,0.35)':'none', transition:'all 0.15s' }}>
                            {p}
                          </button>
                        )}
                        {dotAfter && <span style={{ color:'#cbd5e1', fontWeight:700 }}>•••</span>}
                      </React.Fragment>
                    );
                  })}
                  <button onClick={() => setOrderPage(p => Math.min(totalPages, p+1))} disabled={orderPage === totalPages}
                    style={{ width:32, height:32, borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:orderPage===totalPages?'not-allowed':'pointer', color:orderPage===totalPages?'#cbd5e1':'#475569', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
                </div>
              )}
              </>
            )}
          </>
        )}

        {/* ══ TAB: PRODUCTS ════════════════════════════════════════ */}
        {tab === 'products' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, gap:10, flexWrap:'wrap' }}>
              <p style={{ margin:0, color:'#64748b', fontSize:14 }}>
                {productSearch ? `${products.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase())).length} / ` : ''}{products.length} สินค้า
              </p>
              <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); setImgPreview(''); setImageMode('url'); setFormErr(''); }}
                style={{ padding:'9px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4b8ff4,#4b8ff4)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                + เพิ่มสินค้า
              </button>
            </div>

            {/* Search */}
            <div style={{ position:'relative', marginBottom:20 }}>
              <i className="fas fa-magnifying-glass" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:13 }} />
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 14px 10px 38px', borderRadius:12, border:'1.5px solid #e2e8f0', fontSize:14, fontFamily:'inherit', outline:'none', background:'#fff', transition:'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#8d4d11'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              {productSearch && (
                <button onClick={() => setProductSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:15, lineHeight:1 }}>✕</button>
              )}
            </div>

            {/* Product form */}
            {showForm && (
              <div id="product-form-top" style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e2e8f0', padding:'28px', marginBottom:24, boxShadow:'0 6px 24px rgba(0,0,0,0.08)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
                  <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:'#0f172a' }}>
                    {editId ? '✏️ แก้ไขสินค้า' : '➕ เพิ่มสินค้าใหม่'}
                  </h3>
                  <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); setImgPreview(''); }}
                    style={{ width:32, height:32, borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                </div>

                {/* ─ ชื่อ + ราคา + หน่วย ─ */}
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12, marginBottom:14 }}>
                  <div>
                    <label style={LBL}>ชื่อสินค้า <span style={{ color:'#ef4444' }}>*</span></label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name:e.target.value }))}
                      placeholder="เช่น ข้าวมันไก่" style={INP} />
                  </div>
                  <div>
                    <label style={LBL}>ราคา (฿) <span style={{ color:'#ef4444' }}>*</span></label>
                    <input type="number" min="0" step="0.5" value={form.price} onChange={e => setForm(f => ({ ...f, price:e.target.value }))}
                      placeholder="0.00" style={INP} />
                  </div>
                  <div>
                    <label style={LBL}>หน่วย</label>
                    <div style={{ position:'relative' }}>
                      <input
                        list="unit-list"
                        value={form.unit}
                        onChange={e => setForm(f => ({ ...f, unit:e.target.value }))}
                        placeholder="เช่น ชิ้น, กก."
                        style={INP}
                      />
                      <datalist id="unit-list">
                        {UNITS.map(u => <option key={u} value={u} />)}
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* ─ คำอธิบาย ─ */}
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>คำอธิบายสินค้า</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description:e.target.value }))}
                    placeholder="อธิบายสินค้า วัตถุดิบ หรือรายละเอียดพิเศษ..."
                    rows={3}
                    style={{ ...INP, resize:'vertical', minHeight:72, lineHeight:1.6 }}
                  />
                </div>

                {/* ─ ขนาดสินค้า ─ */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <label style={LBL}>ขนาดสินค้า <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>(สูงสุด 5 ขนาด)</span></label>
                    {(form.sizes||[]).length < 5 && (
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, sizes:[...(f.sizes||[]), { ...emptySize }] }))}
                        style={{ padding:'4px 12px', borderRadius:8, border:'1.5px solid #b8d4fb', background:'#edf3ff', color:'#4b8ff4', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                        + เพิ่มขนาด
                      </button>
                    )}
                  </div>

                  {(form.sizes||[]).length === 0 ? (
                    <div style={{ padding:'12px 16px', borderRadius:10, background:'#f8fafc', border:'1px dashed #e2e8f0', textAlign:'center', fontSize:13, color:'#94a3b8' }}>
                      ยังไม่มีขนาด — กด "+ เพิ่มขนาด" เพื่อเพิ่ม (เช่น S, M, L / เล็ก, กลาง, ใหญ่)
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {(form.sizes||[]).map((sz, i) => (
                        <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 140px 36px', gap:8, alignItems:'center' }}>
                          <div>
                            {i === 0 && <p style={{ margin:'0 0 4px', fontSize:11, fontWeight:700, color:'#94a3b8' }}>ชื่อขนาด</p>}
                            <input
                              value={sz.size_name}
                              onChange={e => setForm(f => { const s=[...f.sizes]; s[i]={...s[i],size_name:e.target.value}; return {...f,sizes:s}; })}
                              placeholder={`ขนาดที่ ${i+1} เช่น S, M, เล็ก, 250ml`}
                              style={INP}
                            />
                          </div>
                          <div>
                            {i === 0 && <p style={{ margin:'0 0 4px', fontSize:11, fontWeight:700, color:'#94a3b8' }}>ราคาเพิ่ม/ลด (฿)</p>}
                            <input
                              type="number" step="0.5"
                              value={sz.price_adjustment}
                              onChange={e => setForm(f => { const s=[...f.sizes]; s[i]={...s[i],price_adjustment:e.target.value}; return {...f,sizes:s}; })}
                              placeholder="0"
                              style={{ ...INP, textAlign:'center' }}
                            />
                          </div>
                          <div style={{ paddingTop: i===0 ? 20 : 0 }}>
                            <button type="button"
                              onClick={() => setForm(f => ({ ...f, sizes:f.sizes.filter((_,j)=>j!==i) }))}
                              style={{ width:36, height:36, borderRadius:8, border:'1px solid #fca5a5', background:'#fff5f5', color:'#ef4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>
                              🗑
                            </button>
                          </div>
                        </div>
                      ))}
                      <p style={{ margin:'4px 0 0', fontSize:11, color:'#94a3b8' }}>
                        💡 ราคาเพิ่ม/ลด = ราคาของขนาดนั้น เทียบกับราคาหลัก เช่น +10 หมายถึงราคาหลัก+10฿, -5 หมายถึงหลัก-5฿
                      </p>
                    </div>
                  )}
                </div>

                {/* ─ รูปภาพ ─ */}
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>รูปภาพสินค้า</label>
                  <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                    {['url','file'].map(m => (
                      <button key={m} type="button" onClick={() => setImageMode(m)} style={{
                        padding:'5px 14px', borderRadius:8, border:'1.5px solid', cursor:'pointer', fontSize:12, fontWeight:600,
                        borderColor: imageMode===m?'#4b8ff4':'#e2e8f0', background: imageMode===m?'#edf3ff':'#fff', color: imageMode===m?'#4b8ff4':'#64748b',
                      }}>
                        {m==='url' ? '🔗 ลิงก์ URL' : '📤 อัปโหลดจากเครื่อง'}
                      </button>
                    ))}
                  </div>
                  {imageMode === 'url' ? (
                    <input value={form.image_url} onChange={e => { setForm(f => ({ ...f, image_url:e.target.value })); setImgPreview(e.target.value); }}
                      placeholder="https://..." style={INP} />
                  ) : (
                    <div>
                      <input type="file" accept="image/*"
                        onChange={async e => { if (e.target.files[0]) { try { await handleFile(e.target.files[0]); } catch { setFormErr('อัปโหลดรูปไม่สำเร็จ'); } } }}
                        style={{ display:'block', fontSize:13 }} />
                      <p style={{ margin:'4px 0 0', fontSize:12, color:'#94a3b8' }}>รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 10MB</p>
                    </div>
                  )}
                  {imgPreview && (
                    <img src={imgPreview} alt="preview" onError={e => { e.target.style.display='none'; }}
                      style={{ marginTop:10, height:80, width:80, objectFit:'cover', borderRadius:10, border:'1px solid #e2e8f0' }} />
                  )}
                </div>

                {/* ─ พร้อมขาย ─ */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, padding:'12px 14px', background:'#f8fafc', borderRadius:10 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'#334155' }}>สถานะการขาย</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, is_available: f.is_available ? 0 : 1 }))}
                    style={{ width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', position:'relative', transition:'all 0.2s', background: form.is_available ? '#22c55e' : '#ef4444' }}>
                    <div style={{ position:'absolute', top:3, left: form.is_available ? 23 : 3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'all 0.2s' }} />
                  </button>
                  <span style={{ fontSize:13, fontWeight:700, color: form.is_available ? '#16a34a' : '#ef4444' }}>{form.is_available ? '🟢 เปิดขาย' : '🔴 ปิดชั่วคราว'}</span>
                </div>

                {formErr && <p style={{ color:'#6b3a0d', fontSize:13, margin:'0 0 12px', padding:'8px 12px', background:'#fff0e8', borderRadius:8 }}>⚠️ {formErr}</p>}

                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={saveProduct} disabled={saving} style={{
                    padding:'10px 24px', borderRadius:10, border:'none', cursor: saving?'not-allowed':'pointer', fontSize:14, fontWeight:700,
                    background: saving?'#94a3b8':'linear-gradient(135deg,#4b8ff4,#4b8ff4)', color:'#fff',
                  }}>
                    {saving ? '⏳ กำลังบันทึก...' : (editId ? '💾 บันทึกการแก้ไข' : '➕ เพิ่มสินค้า')}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); setImgPreview(''); }}
                    style={{ padding:'10px 20px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontSize:14, fontWeight:600, color:'#475569' }}>
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

            {/* Products grid */}
            {(() => {
              const q = productSearch.toLowerCase();
              const visProducts = q ? products.filter(p => (p.name || '').toLowerCase().includes(q)) : products;
              return products.length === 0 ? (
              <div style={{ textAlign:'center', padding:'50px 0', background:'#fff', borderRadius:16, border:'1px solid #e2e8f0' }}>
                <p style={{ fontSize:40, margin:'0 0 10px' }}>🛍️</p>
                <p style={{ color:'#94a3b8', margin:0 }}>ยังไม่มีสินค้า กด "+ เพิ่มสินค้า" เพื่อเริ่มต้น</p>
              </div>
            ) : visProducts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'50px 0', background:'#fff', borderRadius:16, border:'1px solid #e2e8f0' }}>
                <p style={{ fontSize:32, margin:'0 0 10px' }}>🔍</p>
                <p style={{ color:'#94a3b8', margin:0 }}>ไม่พบสินค้าที่ตรงกับ "<strong style={{ color:'#0f172a' }}>{productSearch}</strong>"</p>
              </div>
            ) : (
              <div className="rsp-grid-auto" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
                {visProducts.map(p => (
                  <DashProductCard key={p.product_id} product={p} onEdit={() => openEdit(p)} onDelete={() => deleteProduct(p.product_id)} />
                ))}
              </div>
            );
            })()}
          </>
        )}

        {/* ══ TAB: SALES ═══════════════════════════════════════════ */}
        {tab === 'sales' && (
          <div>
            {/* Month picker */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <label style={{ fontSize:14, fontWeight:700, color:'#475569' }}>เลือกเดือน</label>
              <input
                type="month"
                value={salesMonth}
                max={`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`}
                onChange={e => setSalesMonth(e.target.value)}
                style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:14, fontFamily:'inherit', outline:'none', background:'#fff', cursor:'pointer' }}
              />
              <button onClick={() => fetchSales(shopId, salesMonth)}
                style={{ padding:'8px 16px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4b8ff4,#2d6fd4)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                🔄 โหลด
              </button>
            </div>

            {salesLoading && (
              <div style={{ textAlign:'center', padding:'48px 0', color:'#94a3b8', fontSize:15 }}>⏳ กำลังโหลดข้อมูล...</div>
            )}

            {!salesLoading && salesData && (() => {
              const { daily = [], summary = {}, orders: sOrders = [] } = salesData;
              const maxSale = Math.max(...daily.map(d => Number(d.total_sales) || 0), 1);
              const [yr, mo] = salesMonth.split('-');
              const monthLabel = new Date(Number(yr), Number(mo)-1, 1).toLocaleDateString('th-TH', { month:'long', year:'numeric' });
              return (
                <>
                  <p style={{ margin:'0 0 16px', fontSize:13, color:'#94a3b8', fontWeight:600 }}>สรุปยอดขาย: {monthLabel}</p>

                  {/* Summary cards */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:28 }}>
                    {[
                      { label:'ยอดขายรวม', value: fmt(summary.total_sales || 0), sub:'ออเดอร์ที่สำเร็จ', bg:'#edf3ff', color:'#1a3a6e', big:true },
                      { label:'จำนวนออเดอร์', value: `${summary.order_count || 0} ออเดอร์`, sub:'สำเร็จ', bg:'#f0fdf4', color:'#166534' },
                      { label:'เฉลี่ยต่อออเดอร์', value: fmt(summary.avg_order || 0), sub:'บาท/ออเดอร์', bg:'#fff8f0', color:'#5c2c08' },
                      { label:'ออเดอร์สูงสุด', value: fmt(summary.max_order || 0), sub:'ออเดอร์เดียว', bg:'#fdf4ff', color:'#6b21a8' },
                    { label:'ยกเลิก', value: `${summary.cancelled_count || 0} ออเดอร์`, sub:'ถูกยกเลิก', bg:'#fef2f2', color:'#991b1b' },
                    ].map(c => (
                      <div key={c.label} style={{ background:c.bg, borderRadius:16, padding:'18px 20px' }}>
                        <p style={{ margin:'0 0 4px', fontSize:11, fontWeight:700, color:c.color, textTransform:'uppercase', letterSpacing:'0.06em' }}>{c.label}</p>
                        <p style={{ margin:'0 0 2px', fontSize: c.big ? 22 : 18, fontWeight:800, color:c.color }}>{c.value}</p>
                        <p style={{ margin:0, fontSize:11, color:c.color, opacity:0.7 }}>{c.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Daily bar chart */}
                  <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:20, marginBottom:24 }}>
                    <p style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:'#0f172a' }}>ยอดขายรายวัน</p>
                    {daily.length === 0 ? (
                      <p style={{ textAlign:'center', color:'#94a3b8', padding:'24px 0' }}>ไม่มีข้อมูลในเดือนนี้</p>
                    ) : (
                      <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:160, overflowX:'auto', paddingBottom:8 }}>
                        {daily.map(d => {
                          const pct = Math.max(4, ((Number(d.total_sales)||0) / maxSale) * 100);
                          return (
                            <div key={d.day} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:'1 0 28px', minWidth:28 }}
                              title={`วันที่ ${d.day}: ${fmt(d.total_sales)} (${d.order_count} ออเดอร์)`}>
                              <span style={{ fontSize:9, color:'#94a3b8', marginBottom:3, fontWeight:600 }}>
                                {Number(d.total_sales) > 0 ? `${Math.round(Number(d.total_sales)/1000*10)/10}k`.replace('.0k','k') : ''}
                              </span>
                              <div style={{ width:'100%', background: Number(d.total_sales) > 0 ? 'linear-gradient(180deg,#4b8ff4,#2d6fd4)' : '#e2e8f0', borderRadius:'4px 4px 0 0', height:`${pct}%`, transition:'height 0.3s' }} />
                              <span style={{ fontSize:9, color:'#94a3b8', marginTop:4, fontWeight:600 }}>{d.day}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Orders table */}
                  <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' }}>
                    <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#0f172a' }}>รายการออเดอร์ที่สำเร็จ</p>
                      <span style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>{sOrders.length} รายการ</span>
                    </div>
                    {sOrders.length === 0 ? (
                      <div style={{ textAlign:'center', padding:'36px 0', color:'#94a3b8' }}>ไม่มีออเดอร์ที่สำเร็จในเดือนนี้</div>
                    ) : (
                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                          <thead>
                            <tr style={{ background:'#f8fafc' }}>
                              {['#', 'เลขออเดอร์', 'ลูกค้า', 'วันที่', 'ยอด', 'วิธีชำระ'].map(h => (
                                <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'#64748b', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sOrders.map((o, i) => (
                              <tr key={o.order_id} style={{ borderTop:'1px solid #f1f5f9', background: i%2===0?'#fff':'#fafbfc' }}>
                                <td style={{ padding:'10px 16px', color:'#94a3b8', fontWeight:600 }}>{i+1}</td>
                                <td style={{ padding:'10px 16px', fontWeight:700, color:'#0f172a' }}>#{o.order_id}</td>
                                <td style={{ padding:'10px 16px', color:'#334155' }}>{o.customer_name || '—'}</td>
                                <td style={{ padding:'10px 16px', color:'#64748b', whiteSpace:'nowrap' }}>{fmtD(o.created_at)}</td>
                                <td style={{ padding:'10px 16px', fontWeight:700, color:'#4b8ff4' }}>{fmt(o.total_amount)}</td>
                                <td style={{ padding:'10px 16px', color:'#64748b' }}>{o.payment_method || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop:'2px solid #e2e8f0', background:'#f0fdf4' }}>
                              <td colSpan={4} style={{ padding:'12px 16px', fontWeight:700, color:'#166534', fontSize:13 }}>รวมทั้งหมด</td>
                              <td style={{ padding:'12px 16px', fontWeight:800, color:'#166534', fontSize:15 }}>{fmt(summary.total_sales || 0)}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {!salesLoading && !salesData && (
              <div style={{ textAlign:'center', padding:'48px 0', background:'#fff', borderRadius:16, border:'1px solid #e2e8f0' }}>
                <p style={{ fontSize:36, margin:'0 0 10px' }}>📊</p>
                <p style={{ color:'#94a3b8', margin:0 }}>เลือกเดือนแล้วกด โหลด เพื่อดูยอดขาย</p>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: SHOP INFO ═══════════════════════════════════════ */}
        {tab === 'shop' && shop && (
          <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:24 }}>
            <h3 style={{ margin:'0 0 20px', fontSize:16, fontWeight:700 }}>ข้อมูลร้านค้า</h3>
            {[
              ['ชื่อร้านค้า', shop.shop_name],
              ['ตลาดน้ำ', shop.market_name],
              ['ประเภทสินค้า', shop.category],
              ['เบอร์โทร', shop.phone_number],
              ['เวลาเปิด-ปิด', `${shop.open_time?.slice(0,5) || '-'} – ${shop.close_time?.slice(0,5) || '-'}`],
              ['จำนวนสินค้า', `${shop.product_count} รายการ`],
            ].map(([label, val]) => (
              <div key={label} style={{ display:'flex', padding:'12px 0', borderBottom:'1px solid #f1f5f9', gap:8 }}>
                <span style={{ width:120, minWidth:100, flexShrink:0, fontSize:13, fontWeight:700, color:'#64748b' }}>{label}</span>
                <span style={{ fontSize:14, color:'#0f172a', wordBreak:'break-word', minWidth:0 }}>{val || '—'}</span>
              </div>
            ))}
            {/* สถานะร้าน + toggle */}
            <div style={{ display:'flex', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #f1f5f9', gap:12 }}>
              <span style={{ width:160, flexShrink:0, fontSize:13, fontWeight:700, color:'#64748b' }}>สถานะร้าน</span>
              <span style={{ fontSize:14, color:'#0f172a' }}>{shop.status === 'Open' ? '🟢 เปิด' : '🔴 ปิด'}</span>
              <button
                disabled={togglingId === shopId}
                onClick={async () => {
                  setTogglingId(shopId);
                  try {
                    const res = await secureLocalFetch(`${API_URL}/entrepreneur/shop-status/${shopId}`, {
                      method: 'PUT',
                      headers: authH(),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setShops(prev => prev.map(s => s.shop_id === shopId ? { ...s, status: data.status } : s));
                    }
                  } finally {
                    setTogglingId(null);
                  }
                }}
                style={{
                  marginLeft: 'auto', padding:'7px 18px', borderRadius:10, border:'none', fontSize:13, fontWeight:700, cursor: togglingId === shopId ? 'wait' : 'pointer',
                  background: shop.status === 'Open' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#22c55e,#16a34a)',
                  color:'#fff', boxShadow: shop.status === 'Open' ? '0 3px 10px rgba(239,68,68,0.3)' : '0 3px 10px rgba(34,197,94,0.3)',
                  opacity: togglingId === shopId ? 0.7 : 1, transition:'all 0.2s',
                }}
              >
                {togglingId === shopId ? '...' : shop.status === 'Open' ? '🔴 ปิดร้าน' : '🟢 เปิดร้าน'}
              </button>
            </div>
            <button onClick={() => navigate(`/editshop?shop_id=${shopId}`)} style={{ marginTop:20, padding:'10px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4b8ff4,#4b8ff4)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              ✏️ แก้ไขข้อมูลร้าน
            </button>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}

/* ─── Dashboard Product Card ─────────────────────────────────────── */
function DashProductCard({ product: p, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:'#fff', borderRadius:20, overflow:'hidden',
        boxShadow: hov ? '0 20px 48px rgba(0,0,0,0.13)' : '0 2px 12px rgba(0,0,0,0.07)',
        transform: hov ? 'translateY(-6px)' : 'none',
        transition:'all 0.28s cubic-bezier(0.4,0,0.2,1)',
        display:'flex', flexDirection:'column',
        border:'1px solid rgba(226,232,240,0.6)',
      }}
    >
      {/* Image */}
      <div className="product-img" style={{ background:'#f8fafc', position:'relative', overflow:'hidden', flexShrink:0 }}>
        {p.image_url ? (
          <img src={resolveImg(p.image_url)} alt={p.name}
            onError={e => { e.target.style.display='none'; }}
            style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s ease', transform: hov ? 'scale(1.06)' : 'scale(1.0)' }} />
        ) : (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:40 }}>🛍️</div>
        )}
        <div style={{ position:'absolute', top:10, left:10, padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, backdropFilter:'blur(4px)', background: p.is_available ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.85)', color:'#fff' }}>
          {p.is_available ? '✓ เปิดขาย' : '✕ ปิด'}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding:'14px 16px 16px', flex:1, display:'flex', flexDirection:'column' }}>
        <p style={{ margin:'0 0 4px', fontWeight:700, fontSize:15, color:'#0f172a', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical' }}>{p.name}</p>
        <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:4 }}>
          <span style={{ fontWeight:800, fontSize:17, color:'#0f172a' }}>฿{parseFloat(p.price||0).toLocaleString()}</span>
          {p.unit && <span style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>/ {p.unit}</span>}
        </div>
        {p.description && (
          <p className="rsp-hide-mobile" style={{ margin:'0 0 8px', fontSize:12.5, color:'#94a3b8', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.description}</p>
        )}
        {Array.isArray(p.sizes) && p.sizes.length > 0 && (
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
            {p.sizes.map((s, i) => (
              <span key={i} style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#f1f5f9', color:'#475569', border:'1px solid #e2e8f0' }}>
                {s.size_name}{s.price_adjustment !== 0 ? ` (${s.price_adjustment > 0 ? '+' : ''}${s.price_adjustment}฿)` : ''}
              </span>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:8, marginTop:'auto' }}>
          <button onClick={onEdit}
            style={{ flex:1, padding:'9px 0', borderRadius:10, border:'1.5px solid #4b8ff4', background:'#fff', fontSize:13, fontWeight:600, color:'#4b8ff4', cursor:'pointer', transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='#4b8ff4'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#4b8ff4'; }}>
            ✏️ แก้ไข
          </button>
          <button onClick={onDelete}
            style={{ padding:'9px 14px', borderRadius:10, border:'1.5px solid #e8b895', background:'#fff0e8', fontSize:13, fontWeight:600, color:'#6b3a0d', cursor:'pointer' }}>
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

const LBL = { display:'block', fontSize:12, fontWeight:700, color:'#475569', marginBottom:5 };
const INP = { width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:9, border:'1.5px solid #e2e8f0', fontSize:14, fontFamily:'inherit', outline:'none', background:'#fff', transition:'border-color 0.15s' };
