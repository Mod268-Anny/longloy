// ============================================================
// Cart.jsx — หน้าตะกร้าสินค้า
//
// หน้าที่: แสดงรายการสินค้าในตะกร้า จัดการจำนวน ลบสินค้า
//         ใช้คูปองส่วนลด และนำทางไปหน้า Payment
//
// Flow: localStorage cart → checkout → /payment
//   - ตะกร้า sync จาก localStorage key "cart"
//   - รองรับคูปองส่วนลด (GET /coupons/mine)
//   - รองรับ redeem reward (แลกแต้มเป็นส่วนลด)
//   - เมื่อกด checkout → POST /orders/checkout → navigate("/payment")
// ============================================================
import React, { useState, useEffect } from 'react';
import { checkoutCart } from './api/checkoutCart';
import { syncCartToBackend } from './api/syncCartToBackend';
import { useNavigate, useLocation } from 'react-router-dom';
import API_URL, { secureLocalFetch, resolveImg } from './config';
import { FaTicket, FaTrashCan, FaChevronLeft, FaBasketShopping, FaLocationDot, FaMoneyBillWave, FaRuler, FaShop, FaCreditCard, FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import Footer from './Footer';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';

const NAV = [
  { label: "หน้าแรก",   icon: <MdHome size={18}/>,                path: "/homepage" },
  { label: "ตลาดน้ำ",   icon: <MdStorefront size={18}/>,           path: "/market"   },
  { label: "เกม",       icon: <MdOutlineSportsEsports size={18}/>, path: "/game"     },
  { label: "ช่วยเหลือ", icon: <MdHelpOutline size={18}/>,          path: "/help"     },
];

const CART_FALLBACK = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&q=80';
const imgSrc = (url) => resolveImg(url, CART_FALLBACK);

export default function Cart() {
  const navigate = useNavigate();
  const location = useLocation();

  const [cartItems, setCartItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')) || []; }
    catch { return []; }
  });
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [couponCode,     setCouponCode]     = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg,      setCouponMsg]      = useState(null);
  const [couponLoading,  setCouponLoading]  = useState(false);
  const [couponName,     setCouponName]     = useState('');
  const [myCoupons,      setMyCoupons]      = useState([]);
  const [selectedRedeemId, setSelectedRedeemId] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleDetail = (key) => setExpandedItems(prev => {
    const s = new Set(prev);
    s.has(key) ? s.delete(key) : s.add(key);
    return s;
  });

  useEffect(() => {
    const sync = () => {
      try { setCartItems(JSON.parse(localStorage.getItem('cart')) || []); }
      catch { setCartItems([]); }
    };
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', sync); };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    secureLocalFetch(`${API_URL}/user/my-coupons`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setMyCoupons(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const sameItem = (i, product_id, size_id, size_name) => {
    if (i.product_id !== product_id) return false;
    const iKey = i.size_id ?? i.size_name ?? 'nosize';
    const tKey = size_id ?? size_name ?? 'nosize';
    return iKey === tKey;
  };

  const changeQty = (product_id, size_id, size_name, delta) => {
    setCartItems(prev => {
      const next = prev.map(i =>
        sameItem(i, product_id, size_id, size_name)
          ? { ...i, qty: Math.max(1, i.qty + delta) }
          : i
      );
      localStorage.setItem('cart', JSON.stringify(next)); window.dispatchEvent(new Event('cart-updated'));
      const token = localStorage.getItem('token');
      if (token) syncCartToBackend(next, token);
      return next;
    });
  };

  const removeItem = (product_id, size_id, size_name) => {
    setCartItems(prev => {
      const next = prev.filter(i => !sameItem(i, product_id, size_id, size_name));
      localStorage.setItem('cart', JSON.stringify(next)); window.dispatchEvent(new Event('cart-updated'));
      const token = localStorage.getItem('token');
      if (token) syncCartToBackend(next, token);
      return next;
    });
  };

  const subTotal = cartItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const delivery = 0;
  const total    = Math.max(0, subTotal + delivery - couponDiscount);

  const validateByRedeemId = async (redeem_id, code) => {
    const token = localStorage.getItem('token');
    if (!token) { setCouponMsg({ type: 'error', text: 'กรุณาเข้าสู่ระบบก่อน' }); return; }
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await secureLocalFetch(`${API_URL}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ redeem_id }),
      });
      const data = await res.json();
      if (data.valid) {
        setSelectedRedeemId(redeem_id);
        setCouponCode(code || data.coupon_code || '');
        setCouponDiscount(data.discount_amount);
        setCouponName(data.reward_name || '');
        setCouponMsg({ type: 'success', text: data.message });
      } else {
        setCouponDiscount(0);
        setCouponName('');
        setSelectedRedeemId(null);
        setCouponMsg({ type: 'error', text: data.error || 'โค้ดไม่ถูกต้อง' });
      }
    } catch { setCouponMsg({ type: 'error', text: 'ไม่สามารถตรวจสอบโค้ดได้' }); }
    finally { setCouponLoading(false); }
  };

  const clearCoupon = () => { setCouponCode(''); setCouponDiscount(0); setCouponName(''); setCouponMsg(null); setSelectedRedeemId(null); };

  const [showPayModal, setShowPayModal] = useState(false);

  const openPayModal = () => {
    const fresh = (() => { try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; } })();
    if (!fresh.length) { alert('ไม่มีสินค้าในตะกร้า'); return; }
    if (!fresh[0]?.shop_id) { alert('ไม่พบ shop_id'); return; }
    if (!localStorage.getItem('token')) { alert('กรุณาเข้าสู่ระบบก่อนสั่งซื้อ'); return; }
    setShowPayModal(true);
  };

  const handleCheckout = async (payment_method) => {
    setShowPayModal(false);
    const fresh = (() => { try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; } })();
    const shop_id = fresh[0]?.shop_id;
    const token = localStorage.getItem('token');
    try {
      setIsCheckingOut(true);
      const result = await checkoutCart({ shop_id, token, cartItems: fresh, coupon_code: couponDiscount > 0 ? couponCode.trim() : '', payment_method, redeem_id: couponDiscount > 0 ? selectedRedeemId : null });
      if (payment_method === 'cash') {
        localStorage.removeItem('cart');
        window.dispatchEvent(new Event('cart-updated'));
        navigate('/order-confirmation', { state: { ...result, payment_method: 'cash' } });
      } else {
        navigate('/payment', { state: result });
      }
    } catch (e) {
      alert('สั่งซื้อไม่สำเร็จ: ' + (e.message || 'กรุณาลองใหม่อีกครั้ง'));
    } finally { setIsCheckingOut(false); }
  };

  const totalQty = cartItems.reduce((s, i) => s + i.qty, 0);

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:"#f4f2ef", minHeight:"100vh" }}>
      <style>{`
        @keyframes cart-slide-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .cart-row:hover { background: #faf8f5 !important; }
        .qty-btn:hover { transform: scale(1.12); }
        .coupon-card:hover:not([data-used="true"]):not([data-active="true"]) { border-color: rgba(141,77,17,0.3) !important; background: #fff8f0 !important; }
        .nav-icon-btn:hover { border-color: rgba(141,77,17,0.25) !important; background: #fff8f0 !important; color: #8d4d11 !important; }

        .cart-layout { display:grid; grid-template-columns:1fr 360px; gap:24px; align-items:start; }
        .cart-table-head { display:grid; grid-template-columns:1fr 150px 110px 110px 44px; gap:12px; padding:14px 24px; background:linear-gradient(135deg,#faf8f5,#f4f0ec); border-bottom:1px solid #ede9e3; }
        .cart-item-row { display:grid; grid-template-columns:1fr 150px 110px 110px 44px; gap:12px; padding:20px 24px; align-items:center; transition:background 0.15s; }

        @media (max-width: 768px) {
          .cart-layout { grid-template-columns: 1fr !important; }
          .cart-table-head { display: none !important; }
          .cart-item-row {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
            padding: 16px !important;
          }
          .cart-item-row .cart-col-price { display: none !important; }
          .cart-item-row .cart-col-total { font-size: 16px !important; }
          .cart-item-actions { display: flex !important; align-items: center; justify-content: space-between; margin-top: 12px; }
        }
      `}</style>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(255,255,255,0.96)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e2e8f0", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="rsp-header-inner" style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px", height:68, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
          <button onClick={() => navigate("/homepage")} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
            <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height:45, width:"auto", objectFit:"contain" }} />
          </button>
          <nav className="rsp-desktop-nav" style={{ display:"flex", gap:4 }}>
            {NAV.map(n => {
              const active = location.pathname === n.path;
              return (
                <button key={n.label} onClick={() => navigate(n.path)} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:14, fontWeight:active?600:400, background:active?"#edf3ff":"transparent", color:active?"#4b8ff4":"#475569", transition:"all 0.15s" }}>
                  {n.icon} <span className="rsp-nav-label">{n.label}</span>
                </button>
              );
            })}
          </nav>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => navigate("/cart")} className="nb-icon-btn" style={{ position:"relative", width:40, height:40, borderRadius:10, border:"1px solid rgba(141,77,17,0.25)", background:"#fff8f0", color:"#8d4d11", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
              <i className="fas fa-basket-shopping" style={{ fontSize:17 }} />
              {totalQty > 0 && <span style={{ position:"absolute", top:-4, right:-4, width:18, height:18, borderRadius:"50%", background:"#8d4d11", color:"#fff", fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{totalQty > 9 ? "9+" : totalQty}</span>}
            </button>
            <button onClick={() => navigate("/profile")} className="nav-icon-btn" style={{ width:40, height:40, borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
              <i className="fas fa-user-circle" style={{ fontSize:18 }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="rsp-main" style={{ maxWidth:1160, margin:"0 auto", padding:"36px 24px 80px" }}>

        {/* Breadcrumb */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28 }}>
          <button onClick={() => navigate("/homepage")} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", color:"#64748b", fontSize:13, cursor:"pointer", padding:0, fontWeight:500 }}>
            <FaChevronLeft style={{ fontSize:10 }} /> กลับหน้าแรก
          </button>
          <span style={{ color:"#cbd5e1", fontSize:14 }}>·</span>
          <span style={{ fontSize:13, color:"#0f172a", fontWeight:700 }}>ตะกร้าสินค้า</span>
        </div>

        {/* Page title */}
        <div style={{ marginBottom:28, animation:"cart-slide-in 0.4s ease" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <p style={{ color:"#8d4d11", fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", margin:"0 0 6px" }}>ช้อปปิ้ง</p>
              <h1 style={{ fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:900, color:"#0f172a", margin:0, letterSpacing:"-0.02em" }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}><FaBasketShopping />ตะกร้าสินค้า</span>
                {cartItems.length > 0 && <span style={{ marginLeft:12, fontSize:15, fontWeight:500, color:"#64748b" }}>({totalQty} รายการ)</span>}
              </h1>
            </div>
            {cartItems.length > 0 && cartItems[0].shop_name && (
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 14px", borderRadius:999, background:"#fff8f0", border:"1.5px solid rgba(141,77,17,0.25)", fontSize:13, fontWeight:700, color:"#6b3a0d" }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><FaShop />{cartItems[0].shop_name}</span>
                </span>
                {cartItems[0].market_name && (
                  <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 14px", borderRadius:999, background:"#fff8f0", border:"1.5px solid #d4880a", fontSize:13, fontWeight:600, color:"#5c2c08" }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><FaLocationDot />{cartItems[0].market_name}</span>
                  </span>
                )}
                <span style={{ fontSize:12, color:"#94a3b8" }}>· 1 ร้านค้า ต่อ 1 ใบเสร็จ</span>
              </div>
            )}
          </div>
        </div>

        {cartItems.length === 0 ? (
          /* ── Empty state ──────────────────────────────────────── */
          <div style={{ animation:"cart-slide-in 0.4s ease" }}>
            {/* Hero card */}
            <div style={{
              background:"linear-gradient(135deg,#8d4d11 0%,#6b3a0d 60%,#4a2a0a 100%)",
              borderRadius:28, padding:"52px 28px 44px", textAlign:"center",
              position:"relative", overflow:"hidden", marginBottom:16,
              boxShadow:"0 12px 40px rgba(141,77,17,0.32)",
            }}>
              {/* decorative circles */}
              <div style={{ position:"absolute", top:-50, right:-50, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
              <div style={{ position:"absolute", bottom:-40, left:-40, width:130, height:130, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
              <div style={{ position:"absolute", top:"30%", left:-20, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.03)" }} />

              {/* Icon */}
              <div style={{
                width:88, height:88, borderRadius:"50%",
                background:"rgba(255,255,255,0.15)", border:"2.5px solid rgba(255,255,255,0.28)",
                display:"flex", alignItems:"center", justifyContent:"center",
                margin:"0 auto 22px", backdropFilter:"blur(8px)",
                boxShadow:"0 6px 24px rgba(0,0,0,0.2)",
              }}>
                <i className="fas fa-basket-shopping" style={{ fontSize:36, color:"#fff" }} />
              </div>

              <h2 style={{ margin:"0 0 10px", fontWeight:900, fontSize:"clamp(1.4rem,4vw,1.8rem)", color:"#fff", letterSpacing:"-0.02em" }}>
                ตะกร้าว่างเปล่า
              </h2>
              <p style={{ margin:"0 0 28px", color:"rgba(255,255,255,0.65)", fontSize:14, lineHeight:1.6 }}>
                ยังไม่มีสินค้าในตะกร้า<br/>เริ่มช้อปปิ้งกันเลย!
              </p>
              <button onClick={() => navigate("/market")}
                style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.18)", color:"#fff", border:"1.5px solid rgba(255,255,255,0.32)", borderRadius:14, padding:"13px 32px", fontSize:15, fontWeight:700, cursor:"pointer", backdropFilter:"blur(6px)", transition:"all 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.26)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.18)"}
              >
                <MdStorefront size={18}/> เริ่มช้อปปิ้ง
              </button>
            </div>

            {/* Quick links */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[
                { icon:"fas fa-store", label:"ตลาดน้ำ", sub:"เลือกร้านค้า", path:"/market" },
                { icon:"fas fa-gamepad", label:"เกม", sub:"สะสมแต้ม", path:"/game" },
                { icon:"fas fa-box-open", label:"ออเดอร์", sub:"ติดตามสินค้า", path:"/user-orders" },
              ].map(item => (
                <button key={item.path} onClick={() => navigate(item.path)} style={{
                  background:"#fff", border:"1.5px solid #ede9e3", borderRadius:18,
                  padding:"18px 8px", cursor:"pointer", textAlign:"center",
                  boxShadow:"0 2px 10px rgba(0,0,0,0.04)", transition:"all 0.18s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(141,77,17,0.3)"; e.currentTarget.style.background="#fff8f0"; e.currentTarget.style.transform="translateY(-3px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="#ede9e3"; e.currentTarget.style.background="#fff"; e.currentTarget.style.transform="none"; }}
                >
                  <div style={{ width:44, height:44, borderRadius:13, background:"linear-gradient(135deg,#fff8f0,#ffe8d4)", border:"1.5px solid rgba(141,77,17,0.15)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                    <i className={item.icon} style={{ fontSize:18, color:"#8d4d11" }} />
                  </div>
                  <p style={{ margin:"0 0 2px", fontWeight:700, fontSize:13, color:"#0f172a" }}>{item.label}</p>
                  <p style={{ margin:0, fontSize:11, color:"#94a3b8" }}>{item.sub}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Cart layout ──────────────────────────────────────── */
          <div className="cart-layout">

            {/* ── LEFT: Items ─────────────────────────────────── */}
            <div style={{ background:"#fff", borderRadius:24, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.07)", border:"1px solid #ede9e3", animation:"cart-slide-in 0.4s ease" }}>

              {/* Table header */}
              <div className="cart-table-head">
                {["รายละเอียดสินค้า","จำนวน","ราคา","รวม",""].map(h => (
                  <span key={h} style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</span>
                ))}
              </div>

              {/* Items */}
              {cartItems.map((item, idx) => {
                const itemKey = `${item.product_id}_${item.size_id ?? item.size_name ?? 'nosize'}`;
                const isOpen  = expandedItems.has(itemKey);
                const basePrice = Number(item.base_price || item.price || 0);
                const adj       = Number(item.price_adjustment || 0);
                const unitPrice = Number(item.price || 0);
                const lineTotal = unitPrice * item.qty;
                return (
                  <div key={itemKey} style={{ borderBottom: idx < cartItems.length - 1 ? "1px solid #ede9e3" : "none" }}>
                    <div className="cart-row cart-item-row">
                      {/* Product info */}
                      <div style={{ display:"flex", alignItems:"center", gap:14, minWidth:0 }}>
                        <div style={{ position:"relative", flexShrink:0, cursor:"pointer" }}
                          onClick={() => navigate(`/product/${item.product_id}`)}>
                          <img
                            src={imgSrc(item.img || item.image_url)} alt={item.name}
                            onError={e => { e.target.onerror=null; e.target.src='https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&q=80'; }}
                            style={{ width:80, height:80, borderRadius:18, objectFit:"cover", boxShadow:"0 3px 12px rgba(0,0,0,0.1)", border:"1px solid rgba(226,232,240,0.6)" }}
                          />
                        </div>
                        <div style={{ minWidth:0, flex:1 }}>
                          <p onClick={() => navigate(`/product/${item.product_id}`)} style={{ fontWeight:700, fontSize:14, color:"#0f172a", margin:"0 0 5px", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", lineHeight:1.4, cursor:"pointer" }}
                            onMouseEnter={e => e.currentTarget.style.color="#8d4d11"}
                            onMouseLeave={e => e.currentTarget.style.color="#0f172a"}>{item.name}</p>
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center", marginBottom:6 }}>
                            {item.size_name && (
                              <span style={{ fontSize:11, background:"#fff8f0", color:"#8d4d11", padding:"2px 8px", borderRadius:6, fontWeight:700, border:"1px solid rgba(141,77,17,0.22)" }}>
                                <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><FaRuler />{item.size_name}</span>
                              </span>
                            )}
                            {item.unit && (
                              <span style={{ fontSize:11, background:"#f4f0ec", color:"#6b5a47", padding:"2px 8px", borderRadius:6, fontWeight:600, border:"1px solid #ddd5ca" }}>
                                หน่วย: {item.unit}
                              </span>
                            )}
                          </div>
                          {/* Toggle detail button */}
                          <button
                            onClick={() => toggleDetail(itemKey)}
                            style={{ display:"inline-flex", alignItems:"center", gap:4, background:"none", border:"none", padding:0, cursor:"pointer", fontSize:11, fontWeight:600, color: isOpen ? "#8d4d11" : "#b89a7a", transition:"color 0.15s" }}
                          >
                            <span style={{ display:"inline-block", transition:"transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                            {isOpen ? "ซ่อนรายละเอียด" : "ดูรายละเอียดราคา"}
                          </button>
                        </div>
                      </div>

                      {/* Qty controls */}
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <button className="qty-btn" onClick={() => changeQty(item.product_id, item.size_id, item.size_name, -1)}
                          style={{ width:32, height:32, borderRadius:10, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b", transition:"transform 0.15s, border-color 0.15s", flexShrink:0 }}
                          onMouseEnter={e => e.currentTarget.style.borderColor="#94a3b8"}
                          onMouseLeave={e => e.currentTarget.style.borderColor="#e2e8f0"}
                        >−</button>
                        <span style={{ minWidth:28, textAlign:"center", fontWeight:800, fontSize:15, color:"#0f172a" }}>{item.qty}</span>
                        <button className="qty-btn" onClick={() => changeQty(item.product_id, item.size_id, item.size_name, 1)}
                          style={{ width:32, height:32, borderRadius:10, border:"1.5px solid #c7986e", background:"#fff8f0", cursor:"pointer", fontWeight:700, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", color:"#8d4d11", transition:"transform 0.15s, border-color 0.15s", flexShrink:0 }}
                          onMouseEnter={e => e.currentTarget.style.borderColor="#8d4d11"}
                          onMouseLeave={e => e.currentTarget.style.borderColor="#c7986e"}
                        >+</button>
                      </div>

                      {/* Unit price */}
                      <span className="cart-col-price" style={{ fontWeight:500, fontSize:14, color:"#64748b" }}>
                        ฿{unitPrice.toLocaleString()}
                        {item.unit && <span style={{ fontSize:12, color:'#b0bec5', marginLeft:2 }}>/{item.unit}</span>}
                      </span>

                      {/* Line total + remove */}
                      <div className="cart-item-actions" style={{ display:"contents" }}>
                        <span className="cart-col-total" style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>฿{lineTotal.toLocaleString()}</span>
                        <button
                          onClick={() => removeItem(item.product_id, item.size_id, item.size_name)}
                          style={{ width:36, height:36, borderRadius:10, border:"1.5px solid #ffe8d4", background:"#fff0e8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#b87040", transition:"all 0.15s", flexShrink:0 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor="#e8b895"; e.currentTarget.style.color="#8d4d11"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor="#ffe8d4"; e.currentTarget.style.color="#b87040"; }}
                        >
                          <FaTrashCan style={{ fontSize:13 }} />
                        </button>
                      </div>
                    </div>

                    {/* ── Detail accordion ───────────────────────── */}
                    {isOpen && (
                      <div style={{ padding:"0 24px 18px", background:"#fffaf5", borderTop:"1px dashed #ede9e3", animation:"cart-slide-in 0.2s ease" }}>
                        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12, paddingTop:14 }}>
                          {item.shop_name && (
                            <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:"#6b3a0d", background:"#fff8f0", border:"1px solid rgba(141,77,17,0.2)", borderRadius:8, padding:"4px 10px" }}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><FaShop />{item.shop_name}</span>
                            </span>
                          )}
                          {item.market_name && (
                            <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:"#5c2c08", background:"#fff0db", border:"1px solid #e8b895", borderRadius:8, padding:"4px 10px" }}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><FaLocationDot />{item.market_name}</span>
                            </span>
                          )}
                        </div>

                        {/* Price breakdown table */}
                        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #ede9e3", overflow:"hidden" }}>
                          {/* base price row */}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom: (item.size_name && adj !== 0) ? "1px solid #f4f2ef" : "none" }}>
                            <span style={{ fontSize:13, color:"#7a5c40" }}>ราคาสินค้า</span>
                            <span style={{ fontSize:13, fontWeight:700, color:"#3d1a05" }}>฿{basePrice.toLocaleString()}</span>
                          </div>

                          {/* size adjustment row */}
                          {item.size_name && adj !== 0 && (
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom:"1px solid #f4f2ef", background:"#fffaf5" }}>
                              <span style={{ fontSize:13, color:"#7a5c40" }}>
                                ค่าเพิ่มขนาด <strong style={{ color:"#8d4d11" }}>({item.size_name})</strong>
                              </span>
                              <span style={{ fontSize:13, fontWeight:700, color: adj > 0 ? "#8d4d11" : "#16a34a" }}>
                                {adj > 0 ? "+" : ""}฿{adj.toLocaleString()}
                              </span>
                            </div>
                          )}

                          {/* unit price row */}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom:"1px solid #f4f2ef" }}>
                            <span style={{ fontSize:13, color:"#7a5c40" }}>ราคาต่อชิ้น</span>
                            <span style={{ fontSize:13, fontWeight:800, color:"#3d1a05" }}>฿{unitPrice.toLocaleString()}</span>
                          </div>

                          {/* qty row */}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderBottom:"1px solid #f4f2ef" }}>
                            <span style={{ fontSize:13, color:"#7a5c40" }}>จำนวน</span>
                            <span style={{ fontSize:13, fontWeight:700, color:"#3d1a05" }}>{item.qty} ชิ้น</span>
                          </div>

                          {/* total row */}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", background:"linear-gradient(135deg,#fff8f0,#fef3e6)" }}>
                            <span style={{ fontSize:13, fontWeight:800, color:"#5c2c08" }}>ยอดรวมรายการนี้</span>
                            <span style={{ fontSize:16, fontWeight:900, color:"#8d4d11" }}>฿{lineTotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Footer row */}
              <div style={{ padding:"16px 24px", background:"#faf8f5", borderTop:"1px solid #ede9e3", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <button
                  onClick={() => {
                    const shop_id = cartItems[0]?.shop_id;
                    if (shop_id) navigate(`/shop-product/${shop_id}`);
                    else navigate("/market");
                  }}
                  style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:999, padding:"6px 14px", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="#8d4d11"; e.currentTarget.style.color="#8d4d11"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.color="#475569"; }}
                >
                  ← ช้อปต่อ
                </button>
                <span style={{ fontSize:13, color:"#64748b" }}>รวม <strong style={{ color:"#0f172a" }}>{totalQty}</strong> รายการ · <strong style={{ color:"#0f172a" }}>฿{subTotal.toLocaleString()}</strong></span>
              </div>
            </div>

            {/* ── RIGHT: Order Summary ─────────────────────────── */}
            <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"cart-slide-in 0.45s ease" }}>

              {/* Coupon card */}
              <div style={{ background:"#fff", borderRadius:24, boxShadow:"0 4px 24px rgba(0,0,0,0.07)", border:"1px solid #ede9e3", overflow:"hidden" }}>
                <div style={{ padding:"16px 20px", background:"linear-gradient(135deg,#fffbeb,#fff0db)", borderBottom:"1px solid #e8b895", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <p style={{ fontSize:13, fontWeight:800, color:"#5c2c08", margin:0, display:'flex', alignItems:'center', gap:6 }}><FaTicket />โค้ดส่วนลดของฉัน</p>
                  <span style={{ fontSize:11, color:"#5c2c08", fontWeight:600, background:"#fff0db", padding:"3px 10px", borderRadius:6, border:"1px solid #e8b895" }}>เลือกได้ 1 ใบต่อออเดอร์</span>
                </div>

                <div style={{ padding:"14px 16px" }}>
                  {myCoupons.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"20px 0", color:"#94a3b8" }}>
                      <p style={{ fontSize:28, margin:"0 0 6px", display:'flex', justifyContent:'center' }}><FaTicket /></p>
                      <p style={{ fontSize:13, margin:0, fontWeight:500 }}>ยังไม่มีโค้ดส่วนลด</p>
                      <p style={{ fontSize:12, margin:"4px 0 0", color:"#b0bec5" }}>แลกแต้มที่หน้าเกมเพื่อรับโค้ด</p>
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:260, overflowY:"auto" }}>
                      {myCoupons.map((c) => {
                        const isActive   = selectedRedeemId === c.redeem_id && couponDiscount > 0;
                        const used       = c.is_used === 1 || c.is_used === true;
                        const selectable = !used && !couponLoading;
                        return (
                          <div
                            key={c.redeem_id}
                            className="coupon-card"
                            data-used={used}
                            data-active={isActive}
                            onClick={() => selectable && (isActive ? clearCoupon() : validateByRedeemId(c.redeem_id, c.coupon_code))}
                            style={{
                              display:"flex", alignItems:"center", gap:12,
                              padding:"12px 14px", borderRadius:14,
                              cursor: selectable ? "pointer" : "default",
                              border: `2px solid ${isActive ? "#8d4d11" : used ? "#e2ddd6" : "#ede9e3"}`,
                              background: isActive ? "#fff8f0" : used ? "#faf8f5" : "#fff",
                              opacity: used ? 0.5 : 1,
                              transition:"all 0.2s",
                              boxShadow: isActive ? "0 0 0 3px rgba(141,77,17,0.1)" : "0 1px 4px rgba(0,0,0,0.04)",
                            }}
                          >
                            {/* Radio */}
                            <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0, border:`2px solid ${isActive?"#8d4d11":"#d4c8bb"}`, background:isActive?"#8d4d11":"#fff", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
                              {isActive && <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff" }} />}
                            </div>
                            {/* Info */}
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ margin:0, fontSize:13, fontWeight:700, color: used?"#b0a090":isActive?"#6b3a0d":"#1a0f08" }}>{c.reward_name}</p>
                              <p style={{ margin:"2px 0 0", fontSize:11, color:"#94a3b8", fontFamily:"monospace" }}>
                                {c.coupon_code} <span style={{ fontFamily:'inherit', color:'#b0bec5' }}>· ใบ #{c.redeem_id}</span>
                              </p>
                            </div>
                            {/* Discount / Status */}
                            <div style={{ flexShrink:0, textAlign:'right' }}>
                              {used ? (
                                <span style={{ fontSize:11, color:"#b0a090", fontWeight:600, background:"#f4f0ec", padding:"3px 8px", borderRadius:6 }}>ใช้แล้ว</span>
                              ) : (
                                <span style={{ fontSize:14, fontWeight:800, color:isActive?"#6b3a0d":"#8d4d11" }}>
                                  -฿{Number(c.discount_amount||0).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {couponLoading && <p style={{ marginTop:8, fontSize:12, color:"#94a3b8", textAlign:"center" }}>⏳ กำลังตรวจสอบโค้ด...</p>}
                  {couponMsg && !couponLoading && (
                    <p style={{ marginTop:8, fontSize:12, fontWeight:700, color:couponMsg.type==='success'?"#166534":"#8d4d11", background:couponMsg.type==='success'?"#f0fdf4":"#fff8f0", padding:"8px 12px", borderRadius:8, border:`1px solid ${couponMsg.type==='success'?"#86efac":"rgba(141,77,17,0.25)"}` }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>{couponMsg.type==='success'?<FaCircleCheck />:<FaCircleXmark />}{couponMsg.text}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Order summary card */}
              <div style={{ background:"#fff", borderRadius:24, boxShadow:"0 4px 24px rgba(0,0,0,0.07)", border:"1px solid #ede9e3", overflow:"hidden" }}>
                {/* Header */}
                <div style={{ padding:"18px 22px", background:"linear-gradient(135deg,#8d4d11,#6b3a0d)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <h2 style={{ fontWeight:800, fontSize:16, color:"#fff", margin:0 }}>สรุปคำสั่งซื้อ</h2>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:500 }}>{totalQty} รายการ</span>
                </div>

                <div style={{ padding:"20px 22px" }}>
                  {/* Price rows */}
                  <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:18 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:14, color:"#64748b" }}>ยอดรวมสินค้า</span>
                      <span style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>฿{subTotal.toLocaleString()}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fff8f0", padding:"8px 12px", borderRadius:10, border:"1px solid rgba(141,77,17,0.2)" }}>
                        <span style={{ fontSize:13, color:"#8d4d11", fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}><FaTicket />{couponName || 'ส่วนลดโค้ด'}</span>
                        <span style={{ fontWeight:800, fontSize:14, color:"#8d4d11" }}>-฿{couponDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:14, color:"#64748b" }}>ค่าจัดส่ง</span>
                      <span style={{ fontWeight:700, fontSize:14, color:"#22c55e", display:"flex", alignItems:"center", gap:4 }}>
                        <span style={{ background:"#f0fdf4", border:"1px solid #86efac", padding:"2px 8px", borderRadius:6, fontSize:12 }}>ฟรี</span>
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height:1, background:"linear-gradient(to right,transparent,#d4c8bb,transparent)", margin:"0 0 16px" }} />

                  {/* Total */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                    <span style={{ fontWeight:700, fontSize:16, color:"#0f172a" }}>ยอดรวมทั้งหมด</span>
                    <span style={{ fontWeight:900, fontSize:28, color:"#8d4d11", letterSpacing:"-0.03em" }}>฿{total.toLocaleString()}</span>
                  </div>

                  {/* Payment note */}
                  <div style={{ background:"linear-gradient(135deg,#fff8f0,#fef3e6)", border:"1px solid rgba(141,77,17,0.18)", borderRadius:14, padding:"12px 16px", marginBottom:20, display:"flex", alignItems:"flex-start", gap:10 }}>
                    <span style={{ fontSize:20, flexShrink:0, display:'flex' }}><FaCreditCard /></span>
                    <div>
                      <p style={{ margin:"0 0 2px", fontSize:13, color:"#6b3a0d", fontWeight:700 }}>PromptPay QR / Mobile Banking</p>
                      <p style={{ margin:0, fontSize:12, color:"#8a6040", opacity:0.9 }}>สแกนและโอนผ่าน Mobile Banking ได้ทันที</p>
                    </div>
                  </div>

                  {/* Checkout button */}
                  <button
                    onClick={openPayModal}
                    disabled={isCheckingOut}
                    style={{ width:"100%", padding:"16px", borderRadius:16, border:"none", background:isCheckingOut?"#e2ddd6":"linear-gradient(135deg,#8d4d11,#6b3a0d)", color:isCheckingOut?"#b0a090":"#fff", fontSize:16, fontWeight:800, cursor:isCheckingOut?"default":"pointer", boxShadow:isCheckingOut?"none":"0 8px 28px rgba(141,77,17,0.42)", transition:"all 0.2s", letterSpacing:"0.01em" }}
                    onMouseEnter={e => { if (!isCheckingOut) { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 14px 36px rgba(141,77,17,0.5)"; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=isCheckingOut?"none":"0 8px 28px rgba(141,77,17,0.42)"; }}
                  >
                    {isCheckingOut ? 'กำลังดำเนินการ...' : 'ดำเนินการชำระเงิน'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ── Payment Method Modal ─────────────────────────────────── */}
      {showPayModal && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setShowPayModal(false)}>
          <div style={{ position:'absolute', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)' }} />
          <div onClick={e => e.stopPropagation()}
            style={{ position:'relative', background:'#fff', borderRadius:24, padding:'28px 24px', maxWidth:400, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,0.25)', animation:'cart-slide-in 0.25s ease' }}>

            <h3 style={{ margin:'0 0 6px', fontSize:18, fontWeight:800, color:'#0f172a', textAlign:'center' }}>เลือกวิธีชำระเงิน</h3>
            <p style={{ margin:'0 0 22px', fontSize:13, color:'#64748b', textAlign:'center' }}>
              ยอดรวม <strong style={{ color:'#8d4d11' }}>฿{total.toLocaleString('th-TH', { minimumFractionDigits:2 })}</strong>
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

              {/* Card */}
              <button onClick={() => handleCheckout('card')}
                style={{ display:'flex', alignItems:'center', gap:16, padding:'18px 20px', borderRadius:16, border:'2px solid rgba(141,77,17,0.2)', background:'#fff8f0', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#8d4d11'; e.currentTarget.style.background='#fef0e0'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(141,77,17,0.2)'; e.currentTarget.style.background='#fff8f0'; }}>
                <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#8d4d11,#6b3a0d)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}><FaCreditCard /></div>
                <div>
                  <p style={{ margin:'0 0 2px', fontWeight:800, fontSize:15, color:'#6b3a0d' }}>ชำระผ่านบัตรเครดิต</p>
                  <p style={{ margin:0, fontSize:12, color:'#8a6040' }}>ชำระออนไลน์ทันที · ปลอดภัย SSL</p>
                </div>
                <span style={{ marginLeft:'auto', fontSize:18, color:'#8d4d11' }}>→</span>
              </button>

              {/* Cash */}
              <button onClick={() => handleCheckout('cash')}
                style={{ display:'flex', alignItems:'center', gap:16, padding:'18px 20px', borderRadius:16, border:'2px solid #86efac', background:'#f0fdf4', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#22c55e'; e.currentTarget.style.background='#dcfce7'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#86efac'; e.currentTarget.style.background='#f0fdf4'; }}>
                <div style={{ width:48, height:48, borderRadius:14, background:'#22c55e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}><FaMoneyBillWave /></div>
                <div>
                  <p style={{ margin:'0 0 2px', fontWeight:800, fontSize:15, color:'#15803d' }}>ชำระเงินสด</p>
                  <p style={{ margin:0, fontSize:12, color:'#64748b' }}>จ่ายตอนรับสินค้า · ร้านค้าจัดเตรียมทันที</p>
                </div>
                <span style={{ marginLeft:'auto', fontSize:18, color:'#22c55e' }}>→</span>
              </button>

            </div>

            <button onClick={() => setShowPayModal(false)}
              style={{ marginTop:16, width:'100%', padding:'10px', borderRadius:12, border:'1px solid #e2ddd6', background:'#faf8f5', color:'#8a7060', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
