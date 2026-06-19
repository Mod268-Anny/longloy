import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_URL, { secureLocalFetch } from './config';
import Footer from './Footer';
import Navbar from './Navbar';

const STEPS = [
  { key: 'pending',   label: 'รอยืนยัน',      sub: 'ออเดอร์ถูกส่งแล้ว',     icon: '📋' },
  { key: 'confirmed', label: 'ยืนยันออเดอร์',  sub: 'ร้านค้ารับออเดอร์',      icon: '✅' },
  { key: 'cooking',   label: 'จัดเตรียม',      sub: 'กำลังเตรียมสินค้า',      icon: '🍳' },
  { key: 'completed', label: 'สำเร็จ',          sub: 'พร้อมรับสินค้า',          icon: '🎉' },
];

const STATUS_STEP = {
  awaitingpayment: 0,
  pending:         0,
  confirmed:       1,
  cooking:         2,
  completed:       3,
  cancelled:       -1,
};

const STATUS_INFO = {
  awaitingpayment: { label: 'รอยืนยันออเดอร์',  color: '#5c2c08', bg: '#fff8f0', border: '#e8b895' },
  pending:         { label: 'รอยืนยันออเดอร์',  color: '#5c2c08', bg: '#fff8f0', border: '#e8b895' },
  confirmed:       { label: 'ยืนยันออเดอร์แล้ว', color: '#1a6b3a', bg: '#f0fff8', border: '#86efac' },
  cooking:         { label: 'กำลังจัดเตรียม',   color: '#6b3a0d', bg: '#fff8f0', border: 'rgba(141,77,17,0.35)' },
  completed:       { label: 'สำเร็จ',            color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
  cancelled:       { label: 'ยกเลิก',            color: '#991b1b', bg: '#fef2f2', border: '#fca5a5' },
};

const fmt     = (n) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n);
const fmtDate = (d) => new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function OrderStepper({ status, animated = true }) {
  const key       = (status || '').toLowerCase();
  const stepIdx   = STATUS_STEP[key] ?? 0;
  const cancelled = key === 'cancelled';

  if (cancelled) return (
    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 16, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ fontSize: 32 }}>❌</span>
      <div>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#991b1b' }}>ออเดอร์ถูกยกเลิก</p>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#b91c1c' }}>คำสั่งซื้อนี้ถูกยกเลิกแล้ว</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ede9e3', padding: '24px 28px', boxShadow: '0 2px 12px rgba(141,77,17,0.07)' }}>
      <p style={{ margin: '0 0 20px', fontSize: 11, fontWeight: 700, color: '#8d4d11', textTransform: 'uppercase', letterSpacing: '0.1em' }}>สถานะออเดอร์</p>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, position: 'relative' }}>
        {STEPS.map((step, i) => {
          const done    = i < stepIdx;
          const active  = i === stepIdx;
          const future  = i > stepIdx;

          const dotColor   = done ? '#22c55e' : active ? '#8d4d11' : '#e2ddd6';
          const lineColor  = i < STEPS.length - 1
            ? (i < stepIdx ? '#22c55e' : '#e2ddd6')
            : 'transparent';
          const labelColor = done ? '#16a34a' : active ? '#3d1a05' : '#b0a090';
          const subColor   = done ? '#4ade80' : active ? '#8d4d11' : '#c8bfb5';
          const bgDot      = done ? '#f0fdf4' : active ? '#fff8f0' : '#f8f6f3';

          return (
            <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  position: 'absolute', top: 20, left: '50%', width: '100%', height: 3,
                  background: lineColor, borderRadius: 2,
                  transition: animated ? 'background 0.5s ease' : 'none',
                  zIndex: 0,
                }} />
              )}

              {/* Dot */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', zIndex: 1,
                background: bgDot,
                border: `2.5px solid ${dotColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
                boxShadow: active ? `0 0 0 5px rgba(141,77,17,0.12)` : done ? '0 0 0 4px rgba(34,197,94,0.15)' : 'none',
                transition: animated ? 'all 0.4s ease' : 'none',
              }}>
                {done ? '✓' : <span style={{ fontSize: 16 }}>{step.icon}</span>}
              </div>

              {/* Label */}
              <div style={{ textAlign: 'center', marginTop: 10, paddingLeft: 2, paddingRight: 2 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: active ? 800 : done ? 700 : 500, color: labelColor, lineHeight: 1.3, transition: animated ? 'color 0.4s' : 'none' }}>
                  {step.label}
                </p>
                {(active || done) && (
                  <p style={{ margin: '3px 0 0', fontSize: 10, color: subColor, fontWeight: 500 }}>{step.sub}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { order_id } = useParams();
  const navigate = useNavigate();
  const [order,   setOrder]   = useState(null);
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchOrder = () => {
    const token = localStorage.getItem('token');
    secureLocalFetch(`${API_URL}/orders/${order_id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else { setOrder(data.order); setItems(data.items || []); }
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => {
    fetchOrder();
    const iv = setInterval(fetchOrder, 15000);
    return () => clearInterval(iv);
  }, [order_id]);

  const fmt2 = (n) => `฿${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  if (loading) return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: '#f4f2ef', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p style={{ fontWeight: 600 }}>กำลังโหลด...</p>
      </div>
    </div>
  );

  if (error || !order) return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: '#f4f2ef', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
        <p style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>ไม่พบคำสั่งซื้อ</p>
        <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>{error}</p>
        <button onClick={() => navigate('/user-orders')} style={{ padding: '10px 24px', borderRadius: 12, border: '1.5px solid #ede9e3', background: '#fff', color: '#5c4a38', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← ย้อนกลับ</button>
      </div>
    </div>
  );

  const statusKey  = (order.status || '').toLowerCase();
  const statusInfo = STATUS_INFO[statusKey] || STATUS_INFO.pending;
  const totalAmt   = items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || i.qty || 1)), 0);

  const headerGradient = statusKey === 'completed'
    ? 'linear-gradient(135deg,#166534 0%,#22c55e 100%)'
    : statusKey === 'cancelled'
    ? 'linear-gradient(135deg,#7f1d1d 0%,#ef4444 100%)'
    : 'linear-gradient(135deg,#4a2a0a 0%,#8d4d11 60%,#b87333 100%)';

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: '#f4f2ef', minHeight: '100vh', color: '#0f172a' }}>
      <style>{`@keyframes od-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <Navbar />
      <main className="rsp-main" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Back */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button onClick={() => navigate('/user-orders')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, border: '1.5px solid #ede9e3', background: '#fff', color: '#5c4a38', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            ← ย้อนกลับ
          </button>
          <button onClick={fetchOrder} style={{ padding: '9px 14px', borderRadius: 12, border: '1.5px solid #ede9e3', background: '#fff', color: '#8d4d11', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🔄 รีเฟรช</button>
        </div>

        {/* Hero banner */}
        <div style={{ background: headerGradient, borderRadius: 24, padding: '28px 28px 24px', marginBottom: 20, boxShadow: '0 10px 32px rgba(141,77,17,0.28)', position: 'relative', overflow: 'hidden', animation: 'od-in 0.4s ease' }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>คำสั่งซื้อ</p>
              <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>#{order.order_id}</h2>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{fmtDate(order.created_at)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>{fmt(order.total_amount)}</p>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.border}` }}>
                  {statusInfo.label}
                </span>
                {order.payment_method === 'cash'
                  ? <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700 }}>💵 เงินสด</span>
                  : <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700 }}>💳 บัตร</span>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Status Stepper */}
        <div style={{ marginBottom: 20, animation: 'od-in 0.45s ease' }}>
          <OrderStepper status={order.status} />
        </div>

        {/* Shop info */}
        {order.shop_name && (
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #ede9e3', padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, animation: 'od-in 0.5s ease' }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,#fff8f0,#ffe8d4)', border: '1.5px solid rgba(141,77,17,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏪</div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#3d1a05' }}>{order.shop_name}</p>
              {order.market_name && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#b89a7a' }}>📍 {order.market_name}</p>}
            </div>
          </div>
        )}

        {/* Items */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ede9e3', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: 16, animation: 'od-in 0.55s ease' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #f0ebe3', background: '#faf8f5' }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#3d1a05' }}>🛍️ สินค้าที่สั่ง</h3>
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>ไม่พบรายการสินค้า</div>
          ) : (
            <>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderBottom: i < items.length - 1 ? '1px solid #f4f2ef' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1a0f08' }}>{item.name}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#b89a7a' }}>{fmt2(item.price)} × {item.quantity || item.qty || 1}</p>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#3d1a05' }}>
                    {fmt2(Number(item.price) * Number(item.quantity || item.qty || 1))}
                  </span>
                </div>
              ))}
              <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg,#fff8f0,#fef3e6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#5c2c08' }}>ยอดรวมทั้งหมด</span>
                <span style={{ fontWeight: 900, fontSize: 22, color: '#8d4d11' }}>{fmt(order.total_amount)}</span>
              </div>
            </>
          )}
        </div>

        {/* Payment note */}
        <div style={{ background: order.payment_method === 'cash' ? '#f0fff8' : '#fff8f0', border: `1px solid ${order.payment_method === 'cash' ? '#86efac' : 'rgba(141,77,17,0.25)'}`, borderRadius: 14, padding: '14px 18px', marginBottom: 24, animation: 'od-in 0.6s ease' }}>
          {order.payment_method === 'cash' ? (
            <>
              <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 800, color: '#166534' }}>💵 ชำระเงินสด</p>
              <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>กรุณาเตรียมเงินสดให้พร้อม — ชำระให้กับร้านค้าเมื่อรับสินค้า</p>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 800, color: '#6b3a0d' }}>💳 ชำระบัตรเครดิต</p>
              <p style={{ margin: 0, fontSize: 13, color: '#8d4d11' }}>ชำระเงินออนไลน์แล้ว — ร้านค้ากำลังดำเนินการ</p>
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/user-orders')}
            style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1.5px solid #ede9e3', background: '#fff', color: '#5c4a38', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            ← คำสั่งซื้อทั้งหมด
          </button>
          <button onClick={() => navigate('/market')}
            style={{ flex: 1, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#8d4d11,#6b3a0d)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px rgba(141,77,17,0.35)' }}>
            🛍️ ช้อปต่อ
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
