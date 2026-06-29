// ============================================================
// ShopProfile.jsx — หน้าโปรไฟล์ร้านค้า (ดูร้านพร้อมซื้อสินค้าได้)
//
// หน้าที่: คล้าย ShopPage แต่เน้นข้อมูลร้านและเพิ่มลงตะกร้าได้ทันที
//
// ส่วนที่มี:
//   - รูป / ชื่อร้าน / ตลาด / ประเภท / สถานะเปิดปิด
//   - สินค้าในร้าน (grid) + ปุ่มเพิ่มลงตะกร้า
//   - รีวิวร้าน (GET /shop-reviews)
//   - sync cart กับ backend หลัง login (syncCartToBackend)
//
// เส้นทาง: /shop-profile/:shop_id
// ============================================================
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaBasketShopping, FaComment, FaLocationDot, FaPenToSquare, FaPhone, FaStar, FaChevronLeft, FaCartPlus } from 'react-icons/fa6';
import Footer from './Footer';
import FloatingCart from './FloatingCart';
import { FaUserCircle } from 'react-icons/fa';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';
import { syncCartToBackend } from './api/syncCartToBackend';
import API_URL, { secureLocalFetch, resolveImg } from './config';
import useCartCount from './useCartCount';

const NAV = [
  { label: "หน้าแรก",   icon: <MdHome size={18}/>,                path: "/homepage" },
  { label: "ตลาดน้ำ",   icon: <MdStorefront size={18}/>,           path: "/market"   },
  { label: "เกม",       icon: <MdOutlineSportsEsports size={18}/>, path: "/game"     },
  { label: "ช่วยเหลือ", icon: <MdHelpOutline size={18}/>,          path: "/help"     },
];

const SFALLBACK = 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600&q=80';
const imgSrc = (url) => resolveImg(url, SFALLBACK);

export default function ShopProfile() {
  const { shop_id } = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const cartCount = useCartCount();

  const [shop,      setShop]      = useState(null);
  const [products,  setProducts]  = useState([]);
  const [reviews,   setReviews]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [newReview, setNewReview] = useState({ reviewer_name: '', comment: '', rating: 0 });
  const [submitting,setSubmitting]= useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [hoverStar, setHoverStar] = useState(0);
  const [addedSet,  setAddedSet]  = useState(new Set());

  useEffect(() => {
    if (!shop_id) return;
    setLoading(true);
    secureLocalFetch(`${API_URL}/entrepreneur-by-shop/${shop_id}`).then(r => r.json()).then(d => { setShop(d); setLoading(false); }).catch(() => setLoading(false));
    secureLocalFetch(`${API_URL}/products/by-shop/${shop_id}`).then(r => r.ok ? r.json() : []).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {});
    secureLocalFetch(`${API_URL}/shop-reviews/${shop_id}`).then(r => r.ok ? r.json() : []).then(d => setReviews(Array.isArray(d) ? d : [])).catch(() => {});
  }, [shop_id]);

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating||0), 0) / reviews.length) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!newReview.reviewer_name || !newReview.comment || !newReview.rating) { setError('กรุณากรอกชื่อ รีวิว และให้คะแนน'); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await secureLocalFetch(`${API_URL}/shop-reviews/${shop_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(newReview),
      });
      if (res.ok) {
        setReviews(p => [...p, { ...newReview, created_at: new Date().toISOString() }]);
        setNewReview({ reviewer_name: '', comment: '', rating: 0 });
        setSuccess('ขอบคุณสำหรับรีวิว!');
        setTimeout(() => setSuccess(''), 3000);
      } else { setError('บันทึกรีวิวไม่สำเร็จ'); }
    } catch { setError('เกิดข้อผิดพลาด'); }
    setSubmitting(false);
  };

  const addToCart = (product) => {
    if (!localStorage.getItem('token')) { navigate('/login'); return; }
    try {
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const found = cart.find(i => i.product_id === product.product_id);
      const next = found ? cart.map(i => i.product_id === product.product_id ? { ...i, qty: i.qty+1 } : i) : [...cart, { product_id: product.product_id, name: product.name, price: product.price, img: product.image_url, qty: 1, shop_id }];
      localStorage.setItem('cart', JSON.stringify(next)); window.dispatchEvent(new Event('cart-updated'));
      const token = localStorage.getItem('token');
      if (token) syncCartToBackend(next, token);
    } catch {}
    setAddedSet(s => { const n = new Set(s); n.add(product.product_id); return n; });
    setTimeout(() => setAddedSet(s => { const n = new Set(s); n.delete(product.product_id); return n; }), 1200);
  };

  /* Navbar */
  const Navbar = () => (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="rsp-header-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <button onClick={() => navigate("/homepage")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer" }}>
          <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height: 45, width: "auto", objectFit: "contain" }} />
        </button>
        <nav className="rsp-desktop-nav" style={{ display: "flex", gap: 4 }}>
          {NAV.map(n => { const active = location.pathname === n.path; return <button key={n.label} onClick={() => navigate(n.path)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400, background: active ? "#edf3ff" : "transparent", color: active ? "#4b8ff4" : "#475569" }}>{n.icon} <span className="rsp-nav-label">{n.label}</span></button>; })}
        </nav>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/cart")} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}><i className="fas fa-basket-shopping" style={{ fontSize: 17 }} />{cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}</button>
          <button onClick={() => navigate("/profile")} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><i className="fas fa-user-circle" style={{ fontSize: 18 }} /></button>
        </div>
      </div>
    </header>
  );

  const shopName = shop?.shop_name || "ร้านค้า";
  const initial  = shopName.trim().slice(0,1).toUpperCase();

  if (loading) return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f4f2ef", minHeight: "100vh" }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <Navbar />
      <div style={{ height: 340, background: "linear-gradient(90deg,#e8e0d6 25%,#f4f0ea 50%,#e8e0d6 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f4f2ef", minHeight: "100vh", color: "#1a0f08" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes signGlow{0%,100%{box-shadow:0 0 22px rgba(251,191,36,0.32),0 6px 26px rgba(0,0,0,0.32)}50%{box-shadow:0 0 38px rgba(251,191,36,0.52),0 6px 26px rgba(0,0,0,0.32)}}
        @keyframes sp-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .sp-section{animation:sp-in 0.4s ease;}
        .sp-section:nth-child(2){animation-delay:0.08s;}
        .sp-section:nth-child(3){animation-delay:0.16s;}
        @media (max-width: 640px) {
          .sp-hero        { height: 270px !important; }
          .sp-hero-avatar { width: 66px !important; height: 66px !important; border-radius: 16px !important; }
          .sp-hero-h1     { font-size: 1.28rem !important; }
          .sp-stats-bar   { padding: 10px 14px !important; gap: 8px !important; }
          .sp-stat-pill   { padding: 9px 12px !important; flex: 1; min-width: 0 !important; }
          .sp-stat-val    { font-size: 15px !important; }
          .sp-hero-pad    { padding: 16px 16px 22px !important; }
        }
      `}</style>
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section>
        <div className="sp-hero" style={{ height: 340, position: "relative", overflow: "hidden", background: "#1a0700" }}>
          <img src={imgSrc(shop?.image_url)} alt={shopName}
            onError={e => { e.target.onerror=null; e.target.src=SFALLBACK; }}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 35%" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(10,4,0,0.38) 0%, rgba(6,2,0,0.88) 100%)", pointerEvents: "none" }} />
          {/* Decorative */}
          <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(251,191,36,0.05)", pointerEvents: "none" }} />

          {/* Back */}
          <button onClick={() => navigate(-1)}
            style={{ position: "absolute", top: 18, left: 20, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 999, padding: "7px 18px", color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)", transition: "background 0.2s", zIndex: 2 }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.18)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.1)"}
          >
            <FaChevronLeft style={{ fontSize: 10 }} /> กลับ
          </button>

          {/* Info strip */}
          <div className="sp-hero-pad" style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "18px 28px 26px", display: "flex", alignItems: "flex-end", gap: 18 }}>
            <div className="sp-hero-avatar" style={{ flexShrink: 0, width: 86, height: 86, borderRadius: 22, overflow: "hidden", border: "3px solid rgba(251,191,36,0.65)", background: "linear-gradient(135deg,#6b3a0d,#3d1a05)", display: "flex", alignItems: "center", justifyContent: "center", animation: "signGlow 3s ease-in-out infinite", boxShadow: "0 6px 24px rgba(0,0,0,0.5)" }}>
              {shop?.image_url
                ? <img src={imgSrc(shop.image_url)} alt={shopName} onError={e=>{e.target.style.display="none"}} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 30, fontWeight: 900, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{initial}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, flexWrap: "wrap" }}>
                <span style={{ background: "linear-gradient(135deg,#8d4d11,#6b3a0d)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 11px", borderRadius: 999, letterSpacing: "0.1em", textTransform: "uppercase" }}>ร้านค้า</span>
                {shop?.status === 'Open'
                  ? <span style={{ background: "rgba(34,197,94,0.18)", color: "#4ade80", fontSize: 10, fontWeight: 700, padding: "3px 11px", borderRadius: 999, border: "1px solid rgba(34,197,94,0.38)" }}>● เปิดให้บริการ</span>
                  : <span style={{ background: "rgba(239,68,68,0.18)", color: "#f87171", fontSize: 10, fontWeight: 700, padding: "3px 11px", borderRadius: 999, border: "1px solid rgba(239,68,68,0.35)" }}>● ปิดชั่วคราว</span>
                }
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>{products.length} สินค้า</span>
              </div>
              <h1 className="sp-hero-h1" style={{ margin: "0 0 7px", fontWeight: 900, fontSize: "clamp(1.4rem,3vw,2.1rem)", color: "#fff", textShadow: "0 2px 14px rgba(0,0,0,0.5)", lineHeight: 1.2 }}>{shopName}</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {shop?.location     && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.62)", display:'inline-flex', alignItems:'center', gap:6 }}><FaLocationDot />{shop.location}</span>}
                {shop?.phone_number && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.62)", display:'inline-flex', alignItems:'center', gap:6 }}><FaPhone />{shop.phone_number}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ background: "#fff", borderBottom: "1px solid #ede9e3", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <div className="sp-stats-bar" style={{ maxWidth: 860, margin: "0 auto", padding: "14px 28px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div className="sp-stat-pill" style={{ display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg,#fff8f0,#fef3e6)", border: "1.5px solid rgba(141,77,17,0.18)", borderRadius: 14, padding: "10px 18px" }}>
              <FaStar style={{ color: "#8d4d11", fontSize: 18 }} />
              <div>
                <p className="sp-stat-val" style={{ margin: 0, fontWeight: 900, fontSize: 17, color: "#6b3a0d" }}>{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#b47a45", fontWeight: 600 }}>คะแนนเฉลี่ย</p>
              </div>
            </div>
            <div className="sp-stat-pill" style={{ display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg,#faf8f5,#f4f1ec)", border: "1.5px solid #e2ddd6", borderRadius: 14, padding: "10px 18px" }}>
              <span style={{ fontSize: 18, display:'flex' }}><FaComment /></span>
              <div>
                <p className="sp-stat-val" style={{ margin: 0, fontWeight: 900, fontSize: 17, color: "#5c4a38" }}>{reviews.length}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#8a7060", fontWeight: 600 }}>รีวิวทั้งหมด</p>
              </div>
            </div>
            <div className="sp-stat-pill" style={{ display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg,#faf8f5,#f4f1ec)", border: "1.5px solid #e2ddd6", borderRadius: 14, padding: "10px 18px" }}>
              <span style={{ fontSize: 18, display:'flex' }}><FaBasketShopping /></span>
              <div>
                <p className="sp-stat-val" style={{ margin: 0, fontWeight: 900, fontSize: 17, color: "#5c4a38" }}>{products.length}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#8a7060", fontWeight: 600 }}>สินค้าในร้าน</p>
              </div>
            </div>
            {/* View all products CTA */}
            <button onClick={() => navigate(`/shop-product/${shop_id}`)}
              style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#8d4d11,#6b3a0d)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(141,77,17,0.3)", transition: "all 0.2s", whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(141,77,17,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 4px 16px rgba(141,77,17,0.3)"; }}
            >
              <FaBasketShopping style={{ fontSize: 13 }} /> ดูสินค้าทั้งหมด
            </button>
          </div>
        </div>
      </section>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 80px" }}>

        {/* Description */}
        {shop?.description && (
          <div className="sp-section" style={{ background: "#fff", borderRadius: 20, padding: "20px 24px", marginBottom: 22, boxShadow: "0 2px 14px rgba(0,0,0,0.07)", border: "1px solid #ede9e3", borderLeft: "5px solid #8d4d11" }}>
            <p style={{ margin: 0, fontSize: 14, color: "#5c4a38", lineHeight: 1.85 }}>{shop.description}</p>
          </div>
        )}

        {/* Products grid */}
        {products.length > 0 && (
          <div className="sp-section" style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: "0 0 2px", fontWeight: 900, fontSize: 18, color: "#1a0f08", letterSpacing: "-0.01em", display:'flex', alignItems:'center', gap:8 }}><FaBasketShopping />สินค้าในร้าน</h2>
                <p style={{ margin: 0, fontSize: 12, color: "#b0a090" }}>{products.length} รายการ</p>
              </div>
              <button onClick={() => navigate(`/shop-product/${shop_id}`)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 10, border: "1.5px solid rgba(141,77,17,0.25)", background: "#fff8f0", color: "#8d4d11", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background="#fef0e0"; e.currentTarget.style.borderColor="#8d4d11"; }}
                onMouseLeave={e => { e.currentTarget.style.background="#fff8f0"; e.currentTarget.style.borderColor="rgba(141,77,17,0.25)"; }}
              >
                ดูทั้งหมด →
              </button>
            </div>
            <div className="rsp-grid-auto" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(185px,1fr))", gap: 14 }}>
              {products.map(p => (
                <ProductMiniCard key={p.product_id} product={p} isAdded={addedSet.has(p.product_id)}
                  onAdd={() => addToCart(p)}
                  onView={() => navigate(`/product/${p.product_id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* Review form */}
        <div className="sp-section">
          <ReviewForm
            title="รีวิวร้านค้า"
            value={newReview} onChange={setNewReview}
            hoverStar={hoverStar} setHoverStar={setHoverStar}
            onSubmit={handleSubmit} submitting={submitting}
            error={error} success={success}
          />
        </div>

        {/* Review list */}
        <ReviewList reviews={reviews} />
      </main>

      <FloatingCart />

      <Footer />
    </div>
  );
}

/* ─── ProductMiniCard ────────────────────────────────────────────── */
function ProductMiniCard({ product, isAdded, onAdd, onView }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: "#fff", borderRadius: 20, overflow: "hidden",
        boxShadow: hov ? "0 20px 48px rgba(0,0,0,0.13)" : "0 2px 12px rgba(0,0,0,0.07)",
        transform: hov ? "translateY(-6px)" : "none",
        transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
        border: "1px solid #ede9e3",
      }}>
      <div className="product-img" onClick={onView} style={{ background: "#faf8f5", position: "relative", overflow: "hidden", flexShrink: 0, cursor: "pointer" }}>
        <img src={imgSrc(product.image_url)} alt={product.name}
          onError={e => { e.target.onerror=null; e.target.src='https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200&q=80'; }}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease", transform: hov ? "scale(1.06)" : "scale(1.0)" }} />
        <div style={{ position: "absolute", bottom: 8, left: 10 }}>
          <span style={{ background: "linear-gradient(135deg,#6b3a0d,#8d4d11)", color: "#fff", fontWeight: 800, fontSize: 13, padding: "4px 11px", borderRadius: 999, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
            ฿{Number(product.price||0).toLocaleString()}
          </span>
        </div>
      </div>
      <div style={{ padding: "12px 14px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <p onClick={onView} style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1a0f08", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.4, cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.color="#8d4d11"}
          onMouseLeave={e => e.currentTarget.style.color="#1a0f08"}
        >{product.name}</p>
        <button onClick={onAdd}
          style={{ marginTop: "auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
            background: isAdded ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#8d4d11,#6b3a0d)",
            color: "#fff",
            boxShadow: isAdded ? "0 3px 12px rgba(34,197,94,0.3)" : "0 3px 12px rgba(141,77,17,0.3)" }}>
          <FaCartPlus style={{ fontSize: 13 }} />
          {isAdded ? "เพิ่มแล้ว" : "เพิ่มลงตะกร้า"}
        </button>
      </div>
    </div>
  );
}

/* ─── ReviewForm ─────────────────────────────────────────────────── */
function ReviewForm({ title, value, onChange, hoverStar, setHoverStar, onSubmit, submitting, error, success }) {
  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #ede9e3", borderLeft: "5px solid #8d4d11", padding: "22px 24px", marginBottom: 20, boxShadow: "0 2px 14px rgba(0,0,0,0.07)" }}>
      <h2 style={{ fontWeight: 900, fontSize: 16, color: "#1a0f08", margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ background: "#fff8f0", borderRadius: 10, padding: "5px 9px", fontSize: 17, display:'inline-flex' }}><FaPenToSquare /></span> {title}
      </h2>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="text" placeholder="ชื่อของคุณ" value={value.reviewer_name}
          onChange={e => onChange(v => ({ ...v, reviewer_name: e.target.value }))} disabled={submitting}
          style={{ padding: "11px 14px", borderRadius: 12, border: "1.5px solid #e2ddd6", fontSize: 14, outline: "none", transition: "border-color 0.15s", background: "#faf8f5" }}
          onFocus={e => e.target.style.borderColor="#8d4d11"} onBlur={e => e.target.style.borderColor="#e2ddd6"}
        />
        <textarea placeholder="แบ่งปันประสบการณ์ของคุณ..." value={value.comment}
          onChange={e => onChange(v => ({ ...v, comment: e.target.value }))} disabled={submitting}
          style={{ padding: "11px 14px", borderRadius: 12, border: "1.5px solid #e2ddd6", fontSize: 14, minHeight: 90, outline: "none", resize: "vertical", fontFamily: "inherit", transition: "border-color 0.15s", background: "#faf8f5" }}
          onFocus={e => e.target.style.borderColor="#8d4d11"} onBlur={e => e.target.style.borderColor="#e2ddd6"}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#8a7060" }}>ให้คะแนน:</span>
          {[1,2,3,4,5].map(i => (
            <span key={i} role="button" onClick={() => onChange(v => ({ ...v, rating: i }))}
              onMouseEnter={() => setHoverStar(i)} onMouseLeave={() => setHoverStar(0)}
              style={{ cursor: "pointer", fontSize: 30, color: i <= (hoverStar||value.rating) ? "#8d4d11" : "#e2ddd6", transition: "all 0.12s", transform: i <= (hoverStar||value.rating) ? "scale(1.18)" : "scale(1)", display: "inline-block", lineHeight: 1 }}
            ><FaStar /></span>
          ))}
          {value.rating > 0 && <span style={{ fontSize: 12, color: "#b0a090", marginLeft: 4, fontWeight: 600 }}>{value.rating} ดาว</span>}
        </div>
        {error   && <p style={{ color: "#8d4d11", fontSize: 13, margin: 0, padding: "10px 14px", background: "#fff8f0", borderRadius: 10, border: "1px solid rgba(141,77,17,0.2)", borderLeft: "3px solid #8d4d11" }}>{error}</p>}
        {success && <p style={{ color: "#166534", fontSize: 13, margin: 0, padding: "10px 14px", background: "#f0fdf4", borderRadius: 10, border: "1px solid rgba(34,197,94,0.2)", borderLeft: "3px solid #22c55e" }}>{success}</p>}
        <button type="submit" disabled={submitting}
          style={{ padding: "13px 0", borderRadius: 14, border: "none", background: submitting ? "#e2ddd6" : "linear-gradient(135deg,#8d4d11,#6b3a0d)", color: submitting ? "#b0a090" : "#fff", fontSize: 14, fontWeight: 700, cursor: submitting ? "default" : "pointer", boxShadow: submitting ? "none" : "0 6px 20px rgba(141,77,17,0.35)", transition: "all 0.2s" }}
          onMouseEnter={e => { if (!submitting) { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(141,77,17,0.42)"; }}}
          onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow=submitting?"none":"0 6px 20px rgba(141,77,17,0.35)"; }}
        >
          {submitting ? "กำลังส่ง..." : "ส่งรีวิว"}
        </button>
      </form>
    </div>
  );
}

/* ─── ReviewList ─────────────────────────────────────────────────── */
function ReviewList({ reviews }) {
  if (!reviews.length) return (
    <div style={{ background: "#fff", borderRadius: 20, padding: "48px 24px", textAlign: "center", color: "#b0a090", boxShadow: "0 2px 14px rgba(0,0,0,0.07)", border: "1px solid #ede9e3" }}>
      <p style={{ fontSize: 38, margin: "0 0 10px" }}>⭐</p>
      <p style={{ fontWeight: 700, margin: 0, color: "#5c4a38", fontSize: 16 }}>ยังไม่มีรีวิว</p>
      <p style={{ fontSize: 13, margin: "4px 0 0", color: "#b0a090" }}>เป็นคนแรกที่รีวิวร้านนี้!</p>
    </div>
  );

  const starColor = (rating) => rating >= 4 ? "#8d4d11" : rating >= 3 ? "#b47a45" : "#dc2626";
  const avatarGrad = (rating) => rating >= 4
    ? "linear-gradient(135deg,#8d4d11,#6b3a0d)"
    : rating >= 3 ? "linear-gradient(135deg,#b47a45,#8a5c2e)"
    : "linear-gradient(135deg,#dc2626,#b91c1c)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <h3 style={{ margin: "0 0 14px", fontWeight: 800, fontSize: 16, color: "#1a0f08", letterSpacing: "-0.01em" }}>
        รีวิวจากลูกค้า <span style={{ fontSize: 14, color: "#b0a090", fontWeight: 500 }}>({reviews.length})</span>
      </h3>
      {reviews.map((r, i) => (
        <div key={i} style={{ background: "#fff", borderRadius: 18, borderLeft: `5px solid ${starColor(r.rating)}`, padding: "16px 20px", marginBottom: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #ede9e3", borderLeftWidth: 5 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarGrad(r.rating), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16, flexShrink: 0, boxShadow: "0 3px 10px rgba(0,0,0,0.15)" }}>
                {(r.reviewer_name||"?")[0].toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1a0f08" }}>{r.reviewer_name||"ผู้ใช้ทั่วไป"}</p>
                <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                  {[1,2,3,4,5].map(s => <FaStar key={s} style={{ fontSize: 11, color: s<=(r.rating||0) ? starColor(r.rating) : "#e2ddd6" }} />)}
                </div>
              </div>
            </div>
            {r.created_at && (
              <span style={{ fontSize: 11, color: "#b0a090", background: "#faf8f5", border: "1px solid #ede9e3", borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
                {new Date(r.created_at).toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' })}
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: "#5c4a38", lineHeight: 1.8, margin: 0 }}>{r.comment}</p>
        </div>
      ))}
    </div>
  );
}
