import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API_URL, { secureLocalFetch } from './config';
import Footer from './Footer';
import Navbar from './Navbar';

const STEPS = [
  { label: 'รอยืนยัน',     icon: '📋' },
  { label: 'ยืนยันออเดอร์', icon: '✅' },
  { label: 'จัดเตรียม',    icon: '🍳' },
  { label: 'สำเร็จ',        icon: '🎉' },
];

function MiniStepper({ activeStep = 0 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '20px 0 8px' }}>
      {STEPS.map((step, i) => {
        const done   = i < activeStep;
        const active = i === activeStep;
        const dotBorder = done ? '#22c55e' : active ? '#fff' : 'rgba(255,255,255,0.4)';
        const dotBg     = done ? '#22c55e' : active ? 'rgba(255,255,255,0.25)' : 'transparent';
        const lineColor = i < STEPS.length - 1
          ? (i < activeStep ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)')
          : 'transparent';
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i < STEPS.length - 1 && (
              <div style={{ position: 'absolute', top: 18, left: '50%', width: '100%', height: 2, background: lineColor, borderRadius: 1, zIndex: 0 }} />
            )}
            <div style={{ width: 36, height: 36, borderRadius: '50%', zIndex: 1, background: dotBg, border: `2px solid ${dotBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#fff', fontWeight: 800 }}>
              {done ? '✓' : step.icon}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 10, fontWeight: active ? 800 : 500, color: active ? '#fff' : 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 1.3 }}>{step.label}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderConfirmation() {
  const location      = useLocation();
  const navigate      = useNavigate();
  const paymentResult = location.state;

  const [orderDetails, setOrderDetails] = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!paymentResult?.order_id) { navigate('/homepage'); return; }
    const fetchOrderDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await secureLocalFetch(`${API_URL}/orders/${paymentResult.order_id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setOrderDetails(data); }
      } catch {}
      finally { setLoading(false); }
    };
    fetchOrderDetails();
  }, [paymentResult, navigate]);

  if (!paymentResult) return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: '#f4f2ef', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', marginBottom: 20 }}>ไม่พบข้อมูลการชำระเงิน</p>
        <button onClick={() => navigate('/homepage')} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#8d4d11,#6b3a0d)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>กลับหน้าแรก</button>
      </div>
    </div>
  );

  const fmt = (n) => `฿${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: '#f4f2ef', minHeight: '100vh', color: '#0f172a' }}>
      <style>{`@keyframes oc-in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <Navbar />
      <main className="rsp-main" style={{ maxWidth: 620, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg,#4a2a0a 0%,#8d4d11 55%,#b87333 100%)',
          borderRadius: 24, padding: '32px 28px 24px', marginBottom: 20,
          boxShadow: '0 10px 36px rgba(141,77,17,0.38)', position: 'relative', overflow: 'hidden',
          animation: 'oc-in 0.4s ease',
        }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>
              {paymentResult.payment_method === 'cash' ? '✅' : '🎉'}
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, color: '#fff' }}>
              {paymentResult.payment_method === 'cash' ? 'สั่งซื้อสำเร็จ!' : 'ชำระเงินสำเร็จ!'}
            </h2>
            <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
              {paymentResult.payment_method === 'cash' ? 'ออเดอร์ถูกส่งไปยังร้านค้าแล้ว' : 'ชำระผ่านบัตรเรียบร้อย'}
            </p>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#ffe0b2', marginTop: 6 }}>
              #{paymentResult.order_id}
            </div>
          </div>

          {/* Stepper on hero */}
          <MiniStepper activeStep={0} />
        </div>

        {/* Order info card */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ede9e3', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 16, overflow: 'hidden', animation: 'oc-in 0.5s ease' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #f0ebe3', background: '#faf8f5' }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#3d1a05' }}>📋 รายละเอียดคำสั่งซื้อ</h3>
          </div>
          {[
            ['Order ID',  `#${paymentResult.order_id}`],
            ['วิธีชำระ',  paymentResult.payment_method === 'cash' ? '💵 เงินสด' : '💳 บัตรเครดิต'],
            ['สถานะ',     'รอยืนยันออเดอร์'],
            ['จำนวนเงิน', fmt(paymentResult.amount / 100)],
            ['วันที่',    new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })],
            ...(paymentResult.charge_id ? [['Charge ID', paymentResult.charge_id]] : []),
          ].map(([label, value], i, arr) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 22px', borderBottom: i < arr.length - 1 ? '1px solid #f4f2ef' : 'none' }}>
              <span style={{ fontSize: 13, color: '#b89a7a', fontWeight: 500 }}>{label}</span>
              <span style={{
                fontSize: label === 'จำนวนเงิน' ? 18 : label === 'Charge ID' ? 11 : 14,
                fontWeight: label === 'จำนวนเงิน' ? 900 : 600,
                color: label === 'จำนวนเงิน' ? '#8d4d11' : label === 'สถานะ' ? '#5c2c08' : '#3d1a05',
                fontFamily: label === 'Charge ID' ? 'monospace' : 'inherit',
                background: label === 'สถานะ' ? '#fff8f0' : 'transparent',
                padding: label === 'สถานะ' ? '3px 10px' : '0',
                borderRadius: label === 'สถานะ' ? 8 : 0,
                border: label === 'สถานะ' ? '1px solid rgba(141,77,17,0.25)' : 'none',
              }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Items */}
        {!loading && orderDetails?.items?.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ede9e3', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 16, overflow: 'hidden', animation: 'oc-in 0.55s ease' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid #f0ebe3', background: '#faf8f5' }}>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#3d1a05' }}>🛍️ สินค้าที่สั่งซื้อ</h3>
            </div>
            {orderDetails.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 22px', borderBottom: idx < orderDetails.items.length - 1 ? '1px solid #f4f2ef' : 'none' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1a0f08' }}>{item.name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#b89a7a' }}>{fmt(item.price)} × {item.quantity}</p>
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#3d1a05' }}>{fmt(Number(item.price) * Number(item.quantity))}</span>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#b89a7a', fontSize: 14 }}>⏳ กำลังโหลดรายละเอียด...</div>
        )}

        {/* Next steps guide */}
        <div style={{ background: '#fff8f0', border: '1px solid rgba(141,77,17,0.2)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, animation: 'oc-in 0.6s ease' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: '#5c2c08' }}>
            {paymentResult.payment_method === 'cash' ? '💵 ขั้นตอนถัดไป' : '📱 ขั้นตอนถัดไป'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '📋', text: 'ร้านค้าจะยืนยันออเดอร์ของคุณ' },
              { icon: '🍳', text: 'ร้านค้าเริ่มจัดเตรียมสินค้า' },
              { icon: '🎉', text: 'รับสินค้า' + (paymentResult.payment_method === 'cash' ? ' และชำระเงินสด' : '') },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{step.icon}</span>
                <span style={{ fontSize: 13, color: '#6b3a0d', fontWeight: 500 }}>{step.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/user-orders')}
            style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1.5px solid #ede9e3', background: '#fff', color: '#5c4a38', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            📦 ดูคำสั่งซื้อ
          </button>
          <button onClick={() => navigate('/homepage')}
            style={{ flex: 1, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#8d4d11,#6b3a0d)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px rgba(141,77,17,0.35)' }}>
            🛍️ ช้อปต่อ
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
