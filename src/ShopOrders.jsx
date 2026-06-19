import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaChevronLeft, FaRotateRight } from 'react-icons/fa6';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';
import Footer from './Footer';
import API_URL from './config';
import useCartCount from './useCartCount';

const NAV = [
  { label: 'หน้าแรก',   icon: <MdHome size={18} />,                path: '/homepage' },
  { label: 'ตลาดน้ำ',   icon: <MdStorefront size={18} />,           path: '/market'   },
  { label: 'เกม',       icon: <MdOutlineSportsEsports size={18} />, path: '/game'     },
  { label: 'ช่วยเหลือ', icon: <MdHelpOutline size={18} />,          path: '/help'     },
];

const STATUS = {
  AwaitingPayment: { label: 'รอยืนยันออเดอร์',  bg: '#fff8f0', border: 'rgba(141,77,17,0.3)', color: '#5c2c08', dot: '#8d4d11', icon: '📋' },
  Pending:         { label: 'รอยืนยันออเดอร์',   bg: '#fff8f0', border: 'rgba(141,77,17,0.3)', color: '#5c2c08', dot: '#8d4d11', icon: '📋' },
  Confirmed:       { label: 'ยืนยันออเดอร์แล้ว', bg: '#f0fff8', border: '#86efac',             color: '#166534', dot: '#22c55e', icon: '✅' },
  Cooking:         { label: 'กำลังจัดเตรียม',    bg: '#fff8f0', border: 'rgba(141,77,17,0.4)', color: '#6b3a0d', dot: '#b87333', icon: '🍳' },
  Completed:       { label: 'สำเร็จ',             bg: '#f0fdf4', border: '#bbf7d0',             color: '#166534', dot: '#22c55e', icon: '🎉' },
  Cancelled:       { label: 'ยกเลิก',             bg: '#fef2f2', border: '#fecaca',             color: '#991b1b', dot: '#ef4444', icon: '❌' },
};

const fmt     = n => `฿${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
const fmtDate = d => new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function ShopOrders() {
  const { shop_id } = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const cartCount   = useCartCount();

  const [orders,            setOrders]            = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [tab,               setTab]               = useState('all');
  const [expanded,          setExpanded]          = useState({});

  const fetchOrders = () => {
    setRefreshing(true);
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/shop-orders/${shop_id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const raw = Array.isArray(data) ? data : [];
        const grouped = {};
        raw.forEach(row => {
          if (!grouped[row.order_id]) grouped[row.order_id] = { ...row, items: [] };
          if (row.product_name) grouped[row.order_id].items.push({ name: row.product_name, qty: row.quantity, price: row.unit_price });
        });
        setOrders(Object.values(grouped));
        setLoading(false);
        setRefreshing(false);
      })
      .catch(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => {
    fetchOrders();
    const iv = setInterval(fetchOrders, 15000);
    return () => clearInterval(iv);
  }, [shop_id]);

  const updateStatus = async (orderId, newStatus) => {
    setProcessingOrderId(orderId);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchOrders();
      else alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    } catch { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
    finally { setProcessingOrderId(null); }
  };

  const pendingCount = orders.filter(o => o.status === 'Pending' || o.status === 'AwaitingPayment').length;
  const TABS = [
    { key: 'all',       label: 'ทั้งหมด',         count: orders.length,                                              dot: '#94a3b8' },
    { key: 'pending',   label: 'รอยืนยัน',         count: pendingCount,                                               dot: '#8d4d11' },
    { key: 'Confirmed', label: 'ยืนยันแล้ว',        count: orders.filter(o => o.status === 'Confirmed').length,        dot: '#22c55e' },
    { key: 'Cooking',   label: 'จัดเตรียม',         count: orders.filter(o => o.status === 'Cooking').length,          dot: '#b87333' },
    { key: 'Completed', label: 'สำเร็จ',             count: orders.filter(o => o.status === 'Completed').length,        dot: '#22c55e' },
  ];

  const visible2 = tab === 'all' ? orders
    : tab === 'pending' ? orders.filter(o => o.status === 'Pending' || o.status === 'AwaitingPayment')
    : orders.filter(o => o.status === tab);

  const visible = visible2;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .so-tab-bar { display:flex; gap:6px; overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:2px; scrollbar-width:none; }
        .so-tab-bar::-webkit-scrollbar { display:none; }
        .so-card { transition: box-shadow 0.2s, transform 0.2s; }
        .so-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.1) !important; }
        @media(max-width:640px) { .so-hero-pad { padding: 16px !important; } .so-stats { gap:8px !important; } }
      `}</style>

      {/* ── Navbar ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <div className="rsp-header-inner" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <button onClick={() => navigate('/homepage')} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height: 45, width: 'auto', objectFit: 'contain' }} />
          </button>
          <nav className="rsp-desktop-nav" style={{ display: 'flex', gap: 4 }}>
            {NAV.map(n => {
              const active = location.pathname === n.path;
              return (
                <button key={n.label} onClick={() => navigate(n.path)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 400, background: active ? '#edf3ff' : 'transparent', color: active ? '#4b8ff4' : '#475569', transition: 'all 0.15s' }}>
                  {n.icon} <span className="rsp-nav-label">{n.label}</span>
                </button>
              );
            })}
          </nav>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/cart')} style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <i className="fas fa-basket-shopping" style={{ fontSize: 17 }} />
              {cartCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>}
            </button>
            <button onClick={() => navigate('/profile')} style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-user-circle" style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero banner ── */}
      <section style={{ background: 'linear-gradient(135deg,#8d4d11 0%,#5c2c08 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div className="so-hero-pad" style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '24px 24px 0' }}>
          {/* Back + Refresh row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={() => navigate(-1)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 999, padding: '7px 16px', color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
            >
              <FaChevronLeft style={{ fontSize: 10 }} /> ย้อนกลับ
            </button>
            <button onClick={fetchOrders} disabled={refreshing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '7px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: refreshing ? 'not-allowed' : 'pointer', backdropFilter: 'blur(8px)', opacity: refreshing ? 0.7 : 1, transition: 'all 0.2s' }}
              onMouseEnter={e => { if (!refreshing) e.currentTarget.style.background='rgba(255,255,255,0.25)'; }}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}
            >
              <FaRotateRight style={{ fontSize: 12, animation: refreshing ? 'pulse 1s infinite' : 'none' }} />
              {refreshing ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(1.4rem,3vw,1.8rem)', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.3)', letterSpacing: '-0.01em' }}>
              🧾 จัดการออเดอร์
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>อัปเดตอัตโนมัติทุก 15 วินาที</p>
          </div>

          {/* Stats */}
          {!loading && orders.length > 0 && (
            <div className="so-stats" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingBottom: 20 }}>
              {[
                { label: 'ทั้งหมด',        value: orders.length,                                                                              bg: 'rgba(255,255,255,0.12)', color: '#fff',     icon: '📋' },
                { label: 'จัดเตรียม',       value: orders.filter(o=>o.status==='Cooking').length,                                             bg: 'rgba(75,143,244,0.25)', color: '#93c5fd',  icon: '🍳' },
                { label: 'รอชำระ',           value: orders.filter(o=>o.status==='AwaitingPayment'||o.status==='Pending').length,               bg: 'rgba(249,115,22,0.25)', color: '#fed7aa',  icon: '💳' },
                { label: 'เสร็จสิ้น',        value: orders.filter(o=>o.status==='Completed').length,                                          bg: 'rgba(34,197,94,0.25)',  color: '#86efac',  icon: '✅' },
              ].map(s => (
                <div key={s.label} style={{ flex: '1 1 0', minWidth: 90, background: s.bg, backdropFilter: 'blur(8px)', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 20, color: s.color, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wave */}
        <svg viewBox="0 0 1440 32" style={{ display: 'block', width: '100%', marginTop: orders.length > 0 ? 0 : 20 }} preserveAspectRatio="none">
          <path d="M0,32 C480,0 960,0 1440,32 L1440,32 L0,32 Z" fill="#f4f2ef" />
        </svg>
      </section>

      {/* ── Main ── */}
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 20px 100px', background: '#f4f2ef', minHeight: '60vh' }}>

        {/* Filter tabs */}
        <div className="so-tab-bar" style={{ marginBottom: 20 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: tab === t.key ? 'linear-gradient(135deg,#8d4d11,#6b3a0d)' : '#fff',
                color: tab === t.key ? '#fff' : '#475569',
                boxShadow: tab === t.key ? '0 4px 14px rgba(141,77,17,0.35)' : '0 1px 4px rgba(0,0,0,0.07)',
              }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: tab === t.key ? 'rgba(255,255,255,0.7)' : t.dot, flexShrink: 0 }} />
              {t.label}
              <span style={{ fontSize: 11, fontWeight: 700, background: tab === t.key ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: tab === t.key ? '#fff' : '#64748b', padding: '2px 7px', borderRadius: 999, minWidth: 22, textAlign: 'center' }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12, animation: 'pulse 1.2s infinite' }}>📋</div>
            <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>กำลังโหลดออเดอร์...</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', animation: 'fadeUp 0.4s ease' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>📭</div>
            <p style={{ color: '#0f172a', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>ไม่มีออเดอร์</p>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>ยังไม่มีออเดอร์ในหมวดนี้</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp 0.4s ease' }}>
            {visible.map(order => {
              const s    = STATUS[order.status] || STATUS.Pending;
              const isOpen = expanded[order.order_id];
              const busy   = processingOrderId === order.order_id;

              return (
                <div key={order.order_id} className="so-card"
                  style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', borderLeft: `4px solid ${s.dot}`, border: `1px solid rgba(226,232,240,0.6)`, borderLeft: `4px solid ${s.dot}` }}>

                  {/* Card header — click to expand */}
                  <div onClick={() => setExpanded(p => ({ ...p, [order.order_id]: !p[order.order_id] }))}
                    style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, userSelect: 'none' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                      {/* Status icon */}
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, border: `1.5px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {s.icon}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>#{order.order_id}</span>
                          {order.payment_method === 'cash'
                            ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac' }}>💵 เงินสด</span>
                            : <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#edf3ff', color: '#1a3a6e', border: '1px solid #b8d4fb' }}>💳 ออนไลน์</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(order.created_at)}</span>
                          {order.customer_name && <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>· {order.customer_name}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                      <span style={{ fontWeight: 900, fontSize: 16, color: '#8d4d11', minWidth: 70, textAlign: 'right' }}>{fmt(order.total_amount)}</span>
                      <span style={{ fontSize: 14, color: '#94a3b8', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▾</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${s.border}40`, padding: '16px 20px 20px', background: '#fafcff' }}>

                      {/* Items list */}
                      {order.items?.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>รายการสินค้า ({order.items.length})</p>
                          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            {order.items.map((item, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < order.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛍️</span>
                                  <div>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{item.name}</p>
                                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>× {item.qty} · {fmt(item.price)} / ชิ้น</p>
                                  </div>
                                </div>
                                <span style={{ fontWeight: 800, fontSize: 14, color: '#8d4d11' }}>{fmt(item.price * item.qty)}</span>
                              </div>
                            ))}
                            {/* Total row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fffbeb', borderTop: '1px solid #e8b895' }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#5c2c08' }}>ยอดรวม</span>
                              <span style={{ fontSize: 16, fontWeight: 900, color: '#8d4d11' }}>{fmt(order.total_amount)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Address / Notes */}
                      {order.shipping_address && (
                        <div style={{ padding: '10px 14px', background: '#f0f4ff', borderRadius: 10, fontSize: 13, color: '#1a3a6e', marginBottom: 12, borderLeft: '3px solid #4b8ff4', display: 'flex', gap: 8 }}>
                          <span>📍</span><span>{order.shipping_address}</span>
                        </div>
                      )}
                      {order.notes && (
                        <div style={{ padding: '10px 14px', background: '#fff8f0', borderRadius: 10, fontSize: 13, color: '#5c2c08', marginBottom: 12, borderLeft: '3px solid #8d4d11', display: 'flex', gap: 8 }}>
                          <span>📝</span><span>{order.notes}</span>
                        </div>
                      )}

                      {/* Action buttons — 4-step flow */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                        {/* Mini progress indicator */}
                        {order.status !== 'Cancelled' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 4 }}>
                            {['รอยืนยัน','ยืนยัน','จัดเตรียม','สำเร็จ'].map((label, i) => {
                              const stepIdx = order.status === 'Completed' ? 3 : order.status === 'Cooking' ? 2 : order.status === 'Confirmed' ? 1 : 0;
                              const done = i < stepIdx; const active = i === stepIdx;
                              const c = done ? '#22c55e' : active ? '#8d4d11' : '#e2ddd6';
                              return (
                                <React.Fragment key={i}>
                                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                                    <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${c}`, background: done ? '#22c55e' : active ? '#fff8f0' : '#faf8f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color: done ? '#fff' : c, fontWeight:800 }}>{done ? '✓' : i+1}</div>
                                    <span style={{ fontSize:9, marginTop:3, color: done?'#16a34a':active?'#8d4d11':'#b0a090', fontWeight:active?700:500, whiteSpace:'nowrap' }}>{label}</span>
                                  </div>
                                  {i < 3 && <div style={{ flex:1, height:2, background: i < stepIdx ? '#22c55e' : '#e8e2db', borderRadius:1, marginBottom:14 }} />}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 10 }}>
                          {order.status === 'Completed' ? (
                            <div style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#166534' }}>
                              🎉 สำเร็จแล้ว
                            </div>
                          ) : order.status === 'Cancelled' ? (
                            <div style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#991b1b' }}>
                              ❌ ออเดอร์ถูกยกเลิก
                            </div>
                          ) : order.status === 'AwaitingPayment' ? (
                            <div style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#fff8f0', border: '1px solid rgba(141,77,17,0.3)', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#5c2c08' }}>
                              ⏳ รอลูกค้าชำระเงินออนไลน์
                            </div>
                          ) : order.status === 'Pending' ? (
                            /* Step 1: Pending → Confirm */
                            <button
                              onClick={() => updateStatus(order.order_id, 'Confirmed')}
                              disabled={busy}
                              style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', background: busy ? '#e2e8f0' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: busy ? '#94a3b8' : '#fff', boxShadow: busy ? 'none' : '0 4px 14px rgba(34,197,94,0.4)', transition: 'all 0.2s' }}
                              onMouseEnter={e => { if (!busy) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(34,197,94,0.5)'; }}}
                              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=busy?'none':'0 4px 14px rgba(34,197,94,0.4)'; }}
                            >
                              {busy ? '⏳ กำลังอัปเดต...' : '✅ ยืนยันออเดอร์'}
                            </button>
                          ) : order.status === 'Confirmed' ? (
                            /* Step 2: Confirmed → Cooking */
                            <button
                              onClick={() => updateStatus(order.order_id, 'Cooking')}
                              disabled={busy}
                              style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', background: busy ? '#e2e8f0' : 'linear-gradient(135deg,#8d4d11,#6b3a0d)', color: busy ? '#94a3b8' : '#fff', boxShadow: busy ? 'none' : '0 4px 14px rgba(141,77,17,0.4)', transition: 'all 0.2s' }}
                              onMouseEnter={e => { if (!busy) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(141,77,17,0.5)'; }}}
                              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=busy?'none':'0 4px 14px rgba(141,77,17,0.4)'; }}
                            >
                              {busy ? '⏳ กำลังอัปเดต...' : '🍳 เริ่มจัดเตรียม'}
                            </button>
                          ) : order.status === 'Cooking' ? (
                            /* Step 3: Cooking → Completed */
                            <>
                              <div style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#fff8f0', border: '1px solid rgba(141,77,17,0.3)', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#6b3a0d' }}>
                                🍳 กำลังจัดเตรียม{order.payment_method === 'cash' ? ' · รับเงินสดเมื่อส่ง' : ''}
                              </div>
                              <button
                                onClick={() => updateStatus(order.order_id, 'completed')}
                                disabled={busy}
                                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', background: busy ? '#e2e8f0' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: busy ? '#94a3b8' : '#fff', boxShadow: busy ? 'none' : '0 4px 14px rgba(34,197,94,0.4)', transition: 'all 0.2s' }}
                                onMouseEnter={e => { if (!busy) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(34,197,94,0.5)'; }}}
                                onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=busy?'none':'0 4px 14px rgba(34,197,94,0.4)'; }}
                              >
                                {busy ? '⏳ กำลังอัปเดต...' : '🎉 สำเร็จแล้ว'}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
