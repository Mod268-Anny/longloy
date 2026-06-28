// ============================================================
// Payment.jsx — หน้าชำระเงินด้วยบัตรเครดิต (Omise)
//
// หน้าที่: รับข้อมูลบัตรเครดิต → tokenize ด้วย Omise.js → ส่งชาร์จ
//
// Flow:
//   1. รับ state จาก Cart: { order_id, amount, email, publicKey }
//   2. โหลด Omise.js script จาก cdn.omise.co
//   3. ผู้ใช้กรอกข้อมูลบัตร → Omise.createToken() → ได้ card token
//   4. เรียก createCharge() → POST /payments/create-charge
//   5. ถ้าสำเร็จ → navigate("/order-confirmation")
//
// หมายเหตุ: ไม่เก็บข้อมูลบัตรในระบบ — ส่งตรงไป Omise เท่านั้น
// ============================================================
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';
import { createCharge } from './api/checkoutCart';
import Footer from './Footer';
import useCartCount from './useCartCount';

const NAV = [
  { label:'หน้าแรก',   icon:<MdHome size={18}/>,                path:'/homepage' },
  { label:'ตลาดน้ำ',   icon:<MdStorefront size={18}/>,           path:'/market'   },
  { label:'เกม',       icon:<MdOutlineSportsEsports size={18}/>, path:'/game'     },
  { label:'ช่วยเหลือ', icon:<MdHelpOutline size={18}/>,          path:'/help'     },
];

const STEPS = ['🛒 ตะกร้า', '💳 ชำระเงิน', '✅ ยืนยัน'];

function FocusInput({ icon, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position:'relative' }}>
      {icon && (
        <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, pointerEvents:'none', zIndex:1, opacity: focused ? 1 : 0.4, transition:'opacity 0.2s' }}>
          {icon}
        </span>
      )}
      <input
        {...props}
        className="rsp-input"
        style={{
          width:'100%', boxSizing:'border-box',
          padding: icon ? '13px 14px 13px 42px' : '13px 14px',
          border: `2px solid ${focused ? '#4b8ff4' : '#e8edf3'}`,
          borderRadius:14, fontSize:14, outline:'none',
          fontFamily:'inherit', background: focused ? '#fafbff' : '#fff',
          color:'#1e293b', transition:'all 0.2s',
          boxShadow: focused ? '0 0 0 4px rgba(75,143,244,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
          ...style,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

/* ── Mini credit card preview ─────────────────────────────────── */
function CardPreview({ cardName, cardNumber, expiryMonth, expiryYear }) {
  const num = cardNumber.replace(/\s/g,'').padEnd(16,'•');
  const fmt = [num.slice(0,4), num.slice(4,8), num.slice(8,12), num.slice(12,16)].join(' ');
  const mm  = expiryMonth  || 'MM';
  const yy  = expiryYear   || 'YY';
  const name = cardName?.trim() || 'CARDHOLDER NAME';

  return (
    <div style={{
      borderRadius:20, padding:'22px 24px', marginBottom:24, position:'relative', overflow:'hidden',
      background:'linear-gradient(135deg,#0a1628 0%,#1a3a6e 50%,#1a3a6e 100%)',
      boxShadow:'0 16px 48px rgba(75,143,244,0.5)',
      minHeight:160,
    }}>
      {/* Circles */}
      <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-60, left:-20, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />

      {/* Chip + Logo row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, position:'relative', zIndex:1 }}>
        <div style={{ width:42, height:32, borderRadius:6, background:'linear-gradient(135deg,#8d4d11,#8d4d11)', boxShadow:'0 2px 8px rgba(141,77,17,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:26, height:18, border:'2px solid rgba(0,0,0,0.2)', borderRadius:3, display:'grid', gridTemplateColumns:'1fr 1fr' }}>
            <div style={{ borderRight:'1px solid rgba(0,0,0,0.15)', height:'100%' }} />
          </div>
        </div>
        <span style={{ fontSize:20, filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', opacity:0.9 }}>💳</span>
      </div>

      {/* Card number */}
      <p style={{ margin:'0 0 16px', fontSize:17, fontFamily:'monospace', letterSpacing:'0.18em', color:'rgba(255,255,255,0.9)', fontWeight:600, position:'relative', zIndex:1 }}>
        {fmt}
      </p>

      {/* Name + expiry */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', position:'relative', zIndex:1 }}>
        <div>
          <p style={{ margin:'0 0 2px', fontSize:9, color:'rgba(255,255,255,0.45)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Card Holder</p>
          <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,0.9)', fontWeight:700, letterSpacing:'0.05em' }}>{name}</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ margin:'0 0 2px', fontSize:9, color:'rgba(255,255,255,0.45)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Expires</p>
          <p style={{ margin:0, fontSize:13, fontFamily:'monospace', color:'rgba(255,255,255,0.9)', fontWeight:700 }}>{mm}/{yy}</p>
        </div>
      </div>
    </div>
  );
}

export default function Payment() {
  const location    = useLocation();
  const navigate    = useNavigate();
  const paymentData = location.state;
  const cartCount = useCartCount();

  const [cardName,     setCardName]     = useState('');
  const [cardNumber,   setCardNumber]   = useState('');
  const [expiryMonth,  setExpiryMonth]  = useState('');
  const [expiryYear,   setExpiryYear]   = useState('');
  const [cvv,          setCvv]          = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.omise.co/omise.js';
    script.async = true;
    document.head.appendChild(script);
    window.Omise = window.Omise || {};
    setCardName('TEST CARD');
    setCardNumber('4242 4242 4242 4242');
    setExpiryMonth('12');
    setExpiryYear('25');
    setCvv('222');
  }, []);

  const handleCardNumberChange = (e) => {
    let v = e.target.value.replace(/\s/g,'');
    if (v.length > 16) v = v.slice(0,16);
    setCardNumber(v.replace(/(\d{4})/g,'$1 ').trim());
  };

  const handleExpiryChange = (e) => {
    let v = e.target.value.replace(/\D/g,'');
    if (v.length > 4) v = v.slice(0,4);
    if (v.length >= 2) { setExpiryMonth(v.slice(0,2)); setExpiryYear(v.slice(2,4)); }
    else setExpiryMonth(v);
  };

  const handleCvvChange = (e) => {
    let v = e.target.value.replace(/\D/g,'');
    if (v.length > 3) v = v.slice(0,3);
    setCvv(v);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    try {
      if (!cardName || !cardNumber || !expiryMonth || !expiryYear || !cvv)
        throw new Error('กรุณากรอกข้อมูลบัตรครบถ้วน');
      const clean = cardNumber.replace(/\s/g,'');
      if (clean.length !== 16) throw new Error('เลขบัตรต้องมี 16 หลัก');
      if (!/^\d+$/.test(clean)) throw new Error('เลขบัตรต้องเป็นตัวเลขเท่านั้น');
      if (cvv.length < 3)       throw new Error('CVV ต้องมี 3 หลัก');
      const expM = parseInt(expiryMonth, 10);
      const expY = parseInt(expiryYear,  10);
      if (expM < 1 || expM > 12) throw new Error('เดือนหมดอายุต้องระหว่าง 01-12');
      let fullYear = expY < 100 ? 2000 + expY : expY;
      const now = new Date();
      if (fullYear < now.getFullYear() || (fullYear === now.getFullYear() && expM < now.getMonth()+1))
        throw new Error('บัตรของคุณหมดอายุแล้ว');
      if (!window.Omise?.createToken) throw new Error('Omise library not loaded');
      if (!paymentData.publicKey?.startsWith('pkey_')) throw new Error('Invalid public key');

      window.Omise.setPublicKey(paymentData.publicKey);
      window.Omise.createToken('card', {
        name: cardName, number: clean,
        expiration_month: expM, expiration_year: fullYear, security_code: cvv,
      }, async (statusCode, response) => {
        if (statusCode === 200) {
          try {
            const token = localStorage.getItem('token');
            const chargeResult = await createCharge({
              order_id: paymentData.order_id, token: response.id,
              amount: paymentData.amount, email: paymentData.email, userToken: token,
            });
            if (chargeResult.success) {
              localStorage.removeItem('cart');
              navigate('/order-confirmation', { state: chargeResult });
            } else throw new Error(chargeResult.message || 'Payment failed');
          } catch (ce) { setError(ce.message); }
        } else {
          let msg = 'ไม่สามารถสร้าง token การชำระเงิน';
          if (response.errors?.length) msg = response.errors.map(e=>e.message).join('\n');
          else if (response.message) msg = response.message;
          setError(`Token Error (${statusCode}): ${msg}`);
        }
        setIsProcessing(false);
      });
    } catch (err) { setError(err.message); setIsProcessing(false); }
  };

  /* ── No payment data ──────────────────────────────────────── */
  if (!paymentData) {
    return (
      <div style={{ minHeight:'100vh', background:'#f0f4f8', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',system-ui,sans-serif", gap:16 }}>
        <div style={{ fontSize:48 }}>😕</div>
        <p style={{ fontSize:16, color:'#64748b', fontWeight:600 }}>ไม่พบข้อมูลการชำระเงิน</p>
        <button onClick={() => navigate('/cart')} style={{ padding:'11px 28px', background:'linear-gradient(135deg,#4b8ff4,#4b8ff4)', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:14, fontFamily:'inherit', boxShadow:'0 4px 16px rgba(75,143,244,0.3)' }}>
          กลับไปตะกร้าสินค้า
        </button>
      </div>
    );
  }

  const amountTHB = (paymentData.amount / 100).toFixed(2);

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f8', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`
        @keyframes pay-slide { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .pay-input-wrap input:focus { border-color: #4b8ff4 !important; }
      `}</style>

      {/* ── Navbar ──────────────────────────────────────────── */}
      <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(255,255,255,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e2e8f0", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="rsp-header-inner" style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px", height:68, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
          <button onClick={() => navigate("/homepage")} style={{ background:"none", border:"none", cursor:"pointer", padding:0, flexShrink:0 }}>
            <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height:45, width:"auto", objectFit:"contain" }} />
          </button>
          <nav style={{ display:"flex", gap:4 }}>
            {NAV.map(n => {
              const active = location.pathname === n.path;
              return (
                <button key={n.label} onClick={() => navigate(n.path)} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:14, fontWeight:active?600:400, background:active?"#edf3ff":"transparent", color:active?"#4b8ff4":"#475569", transition:"all 0.15s" }}>
                  {n.icon} <span className="rsp-nav-label">{n.label}</span>
                </button>
              );
            })}
          </nav>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => navigate("/cart")} style={{ width:40, height:40, borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
              <i className="fas fa-basket-shopping" style={{ fontSize:17 }} />
              {cartCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, width:16, height:16, borderRadius:"50%", background:"#ef4444", color:"#fff", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{cartCount}</span>}
            </button>
            <button onClick={() => navigate("/profile")} style={{ width:40, height:40, borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <i className="fas fa-user-circle" style={{ fontSize:18 }} />
            </button>
          </div>
        </div>
      </header>

      <main className="rsp-main" style={{ maxWidth:540, margin:'0 auto', padding:'36px 20px 80px', animation:'pay-slide 0.4s ease' }}>

        {/* ── Step indicator ─────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, marginBottom:32 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{
                  width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
                  background: i === 1 ? 'linear-gradient(135deg,#4b8ff4,#2d6fd4)' : i < 1 ? '#4b8ff4' : '#e8edf3',
                  color: i <= 1 ? '#fff' : '#94a3b8',
                  boxShadow: i === 1 ? '0 4px 14px rgba(75,143,244,0.4)' : 'none',
                  transition:'all 0.2s',
                }}>
                  {i < 1 ? '✓' : i === 1 ? '●' : '○'}
                </div>
                <span style={{ fontSize:11, fontWeight:i===1?700:500, color:i===1?'#4b8ff4':i<1?'#4b8ff4':'#94a3b8', whiteSpace:'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length-1 && (
                <div style={{ width:48, height:2, background: i < 1 ? '#4b8ff4' : '#e8edf3', margin:'0 4px', marginBottom:20, flexShrink:0 }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Credit card preview ─────────────────────────────── */}
        <CardPreview cardName={cardName} cardNumber={cardNumber} expiryMonth={expiryMonth} expiryYear={expiryYear} />

        {/* ── Order summary ──────────────────────────────────── */}
        <div style={{ background:'#fff', borderRadius:22, border:'1px solid #e8edf3', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', marginBottom:16, overflow:'hidden' }}>
          <div style={{ padding:'14px 22px', background:'linear-gradient(135deg,#f8fafc,#f0f4f8)', borderBottom:'1px solid #e8edf3', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>🧾</span>
            <p style={{ margin:0, fontSize:12, fontWeight:800, color:'#64748b', letterSpacing:'0.1em', textTransform:'uppercase' }}>สรุปรายการสั่งซื้อ</p>
          </div>
          <div style={{ padding:'18px 22px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { label:'Order ID', value:`#${paymentData.order_id}`, mono:true },
                { label:'ชื่อ',    value: paymentData.fullName },
                { label:'อีเมล',   value: paymentData.email },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, color:'#94a3b8', fontWeight:600 }}>{r.label}</span>
                  <span style={{ fontSize:13, color:'#1e293b', fontWeight:700, fontFamily:r.mono?'monospace':'inherit' }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ height:1, background:'linear-gradient(to right,transparent,#e2e8f0,transparent)', margin:'16px 0' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:15, fontWeight:700, color:'#1e293b' }}>ยอดรวมทั้งหมด</span>
              <span style={{ fontSize:28, fontWeight:900, color:'#4b8ff4', letterSpacing:'-0.02em' }}>฿{amountTHB}</span>
            </div>
          </div>
        </div>

        {/* ── Test card shortcut ──────────────────────────────── */}
        <button
          type="button"
          onClick={() => { setCardName('TEST CARD'); setCardNumber('4242 4242 4242 4242'); setExpiryMonth('12'); setExpiryYear('25'); setCvv('222'); }}
          style={{ width:'100%', padding:'11px', background:'none', color:'#4b8ff4', border:'2px dashed #b8d4fb', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', marginBottom:16, transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background='#edf3ff'; e.currentTarget.style.borderColor='#85b3f7'; }}
          onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.borderColor='#b8d4fb'; }}
        >
          ✨ กรอกบัตรทดสอบอัตโนมัติ (4242…)
        </button>

        {/* ── Error ──────────────────────────────────────────── */}
        {error && (
          <div style={{ marginBottom:16, background:'#fff0e8', border:'2px solid #e8b895', color:'#5c2c08', padding:'12px 16px', borderRadius:14, fontSize:13, fontWeight:600, display:'flex', alignItems:'flex-start', gap:8 }}>
            <span>❌</span><span>{error}</span>
          </div>
        )}

        {/* ── Card form ──────────────────────────────────────── */}
        <div style={{ background:'#fff', borderRadius:22, border:'1px solid #e8edf3', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', overflow:'hidden' }}>
          <div style={{ padding:'14px 22px', background:'linear-gradient(135deg,#edf3ff,#f0f4ff)', borderBottom:'1px solid #dde8fc', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>🔒</span>
            <p style={{ margin:0, fontSize:12, fontWeight:800, color:'#4b8ff4', letterSpacing:'0.1em', textTransform:'uppercase' }}>ข้อมูลบัตรเครดิต · SSL Encrypted</p>
          </div>

          <form onSubmit={handlePayment} style={{ padding:'22px', display:'flex', flexDirection:'column', gap:16 }}>
            {/* Card name */}
            <div>
              <label style={{ fontSize:13, fontWeight:700, color:'#475569', display:'block', marginBottom:7 }}>ชื่อผู้ถือบัตร</label>
              <FocusInput icon="👤" type="text" value={cardName} onChange={e=>setCardName(e.target.value.toUpperCase())} placeholder="JOHN DOE" disabled={isProcessing} />
            </div>

            {/* Card number */}
            <div>
              <label style={{ fontSize:13, fontWeight:700, color:'#475569', display:'block', marginBottom:7 }}>เลขบัตรเครดิต</label>
              <FocusInput icon="💳" type="text" value={cardNumber} onChange={handleCardNumberChange} placeholder="1234 5678 9012 3456" style={{ fontFamily:'monospace', letterSpacing:'2px' }} disabled={isProcessing} />
            </div>

            {/* Expiry + CVV */}
            <div className="rsp-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:700, color:'#475569', display:'block', marginBottom:7 }}>หมดอายุ MM/YY</label>
                <FocusInput icon="📅" type="text" value={expiryMonth&&expiryYear?`${expiryMonth}/${expiryYear}`:expiryMonth} onChange={handleExpiryChange} placeholder="MM/YY" disabled={isProcessing} />
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:700, color:'#475569', display:'block', marginBottom:7 }}>CVV</label>
                <FocusInput icon="🔑" type="password" value={cvv} onChange={handleCvvChange} placeholder="•••" disabled={isProcessing} />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isProcessing}
              style={{
                background: isProcessing ? '#e2e8f0' : 'linear-gradient(135deg,#4b8ff4,#2d6fd4)',
                color: isProcessing ? '#94a3b8' : '#fff',
                borderRadius:16, padding:'16px', fontWeight:800, fontSize:16,
                width:'100%', border:'none', cursor:isProcessing?'not-allowed':'pointer',
                fontFamily:'inherit', letterSpacing:'0.02em', marginTop:4,
                boxShadow: isProcessing ? 'none' : '0 8px 24px rgba(75,143,244,0.42)',
                transition:'all 0.2s',
              }}
              onMouseEnter={e => { if (!isProcessing) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(75,143,244,0.5)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=isProcessing?'none':'0 8px 24px rgba(75,143,244,0.42)'; }}
            >
              {isProcessing ? '⏳ กำลังประมวลผล...' : `🔒 ชำระเงิน ฿${amountTHB}`}
            </button>

            {/* Security note */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:2 }}>
              <span style={{ fontSize:12 }}>🛡️</span>
              <span style={{ fontSize:12, color:'#94a3b8', fontWeight:500 }}>ข้อมูลบัตรถูกเข้ารหัส SSL 256-bit</span>
            </div>
          </form>
        </div>

        {/* ── Test card info ──────────────────────────────────── */}
        <div style={{ marginTop:16, background:'linear-gradient(135deg,#f0f4ff,#e0f2fe)', border:'1.5px solid #bae6fd', borderRadius:16, padding:'16px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <span style={{ fontSize:16 }}>🧪</span>
            <p style={{ margin:0, fontSize:12, fontWeight:800, color:'#1a3a6e', letterSpacing:'0.08em', textTransform:'uppercase' }}>ข้อมูลบัตรทดสอบ</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'4px 16px', fontSize:13 }}>
            {[
              ['เลขบัตร', '4242 4242 4242 4242', true],
              ['CVV',     '222',                  true],
              ['หมดอายุ', '12/25',                true],
            ].map(([k,v,mono]) => (
              <React.Fragment key={k}>
                <span style={{ color:'#64748b', fontWeight:600 }}>{k}</span>
                <span style={{ fontFamily:mono?'monospace':'inherit', fontWeight:700, color:'#0a2a5e' }}>{v}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
