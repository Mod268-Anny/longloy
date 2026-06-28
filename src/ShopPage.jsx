// ============================================================
// ShopPage.jsx — หน้าร้านค้า (Shop Detail Page)
//
// หน้าที่: แสดงสินค้าของร้าน + รีวิวร้าน
//
// ส่วนที่มี:
//   - Header ร้าน: ชื่อ, รูป, ประเภท, เวลาเปิดปิด, สถานะ
//   - ค้นหาสินค้าภายในร้าน
//   - Grid สินค้า → กดดูรายละเอียด หรือ เพิ่มตะกร้า
//   - รีวิวร้านค้า + ฟอร์มส่งรีวิว
//
// API: GET /shops/:shop_id, GET /products/by-shop/:id, GET/POST /shop-reviews
// เส้นทาง: /shop/:shop_id
// ============================================================
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FaBasketShopping,
  FaMagnifyingGlass, FaStar, FaChevronLeft,
} from 'react-icons/fa6';
import Footer from './Footer';
import FloatingCart from './FloatingCart';
import { FaUserCircle } from 'react-icons/fa';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';
import API_URL, { secureLocalFetch, resolveImg } from './config';
import useCartCount from './useCartCount';

const NAV = [
  { label: "หน้าแรก",  icon: <MdHome size={18}/>,                path: "/homepage" },
  { label: "ตลาดน้ำ",  icon: <MdStorefront size={18}/>,           path: "/market"   },
  { label: "เกม",      icon: <MdOutlineSportsEsports size={18}/>, path: "/game"     },
  { label: "ช่วยเหลือ",icon: <MdHelpOutline size={18}/>,          path: "/help"     },
];

const SFALLBACK = 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600&q=80';
const imgSrc = (url) => resolveImg(url, SFALLBACK);

function Stars({ rating, size = 13 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <FaStar key={i} style={{ fontSize: size, color: i <= Math.round(rating) ? '#8d4d11' : '#e2e8f0' }} />
      ))}
    </div>
  );
}

const getCartShopId = () => {
  try { const c = JSON.parse(localStorage.getItem('cart')); return c?.length ? String(c[0].shop_id) : null; }
  catch { return null; }
};

export default function ShopPage() {
  const { market_id } = useParams();
  const navigate       = useNavigate();
  const location       = useLocation();
  const cartCount = useCartCount();

  const [shops,        setShops]        = useState([]);
  const [shopRatings,  setShopRatings]  = useState({});
  const [marketName,   setMarketName]   = useState('');
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filteredShops,setFilteredShops]= useState([]);
  const [sortBy,       setSortBy]       = useState('open_first');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [cartShopId,   setCartShopId]   = useState(getCartShopId);

  useEffect(() => {
    const update = () => setCartShopId(getCartShopId());
    window.addEventListener('storage', update);
    window.addEventListener('cart-updated', update);
    return () => { window.removeEventListener('storage', update); window.removeEventListener('cart-updated', update); };
  }, []);

  useEffect(() => {
    if (!market_id) return;
    setLoading(true);

    // fetch market name
    secureLocalFetch(`${API_URL}/floating-markets/all`)
      .then(r => r.json())
      .then(markets => {
        if (!Array.isArray(markets)) return;
        const found = markets.find(m => String(m.market_id) === String(market_id));
        setMarketName(found?.name || '');
      })
      .catch(() => {});

    // fetch shops
    secureLocalFetch(`${API_URL}/shops/by-market/${market_id}`)
      .then(r => r.json())
      .then(async data => {
        if (!Array.isArray(data)) { setShops([]); setFilteredShops([]); setLoading(false); return; }
        setShops(data); setFilteredShops(data);
        const ratingsObj = {};
        await Promise.all(data.map(async shop => {
          try {
            const r = await secureLocalFetch(`${API_URL}/shop-reviews/${shop.shop_id}`);
            if (!r.ok) { ratingsObj[shop.shop_id] = { avg: 0, count: 0 }; return; }
            const reviews = await r.json();
            if (!Array.isArray(reviews)) { ratingsObj[shop.shop_id] = { avg: 0, count: 0 }; return; }
            const ratings = reviews.map(rv => rv.rating || 0).filter(rv => rv > 0);
            ratingsObj[shop.shop_id] = { avg: ratings.length ? ratings.reduce((a,b) => a+b,0)/ratings.length : 0, count: ratings.length };
          } catch { ratingsObj[shop.shop_id] = { avg: 0, count: 0 }; }
        }));
        setShopRatings(ratingsObj);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [market_id]);

  useEffect(() => {
    let result = searchTerm.trim()
      ? shops.filter(s => (s.shop_name || s.description || s.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
      : [...shops];
    if (sortBy === 'open_first')   result.sort((a, b) => (a.status === 'Open' ? 0 : 1) - (b.status === 'Open' ? 0 : 1));
    if (sortBy === 'closed_first') result.sort((a, b) => (a.status === 'Closed' ? 0 : 1) - (b.status === 'Closed' ? 0 : 1));
    if (sortBy === 'rating')       result.sort((a, b) => (shopRatings[b.shop_id]?.avg || 0) - (shopRatings[a.shop_id]?.avg || 0));
    if (sortBy === 'name_az')      result.sort((a, b) => (a.shop_name || '').localeCompare(b.shop_name || ''));
    setFilteredShops(result);
  }, [searchTerm, shops, sortBy, shopRatings]);

  if (!market_id) return <div style={{ padding: 40, textAlign: "center" }}>ไม่พบตลาดน้ำนี้</div>;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f4f5f7", minHeight: "100vh" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes shopFadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .shop-search::placeholder{color:rgba(255,255,255,0.5);}
        .shop-search:focus{outline:none;border-color:rgba(255,255,255,0.7)!important;box-shadow:0 0 0 3px rgba(255,255,255,0.1);}
        .shop-hero-title{color:#ffffff!important;}
      `}</style>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="rsp-header-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height: 45, width: "auto", objectFit: "contain" }} />
          </button>
          <nav className="rsp-desktop-nav" style={{ display: "flex", gap: 4 }}>
            {NAV.map(n => {
              const active = location.pathname === n.path;
              return (
                <button key={n.label} onClick={() => navigate(n.path)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400, background: active ? "#edf3ff" : "transparent", color: active ? "#4b8ff4" : "#475569", transition: "all 0.15s" }}>
                  {n.icon} <span className="rsp-nav-label">{n.label}</span>
                </button>
              );
            })}
          </nav>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => navigate("/cart")} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <i className="fas fa-basket-shopping" style={{ fontSize: 17 }} />
              {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
            </button>
            <button onClick={() => navigate("/profile")} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fas fa-user-circle" style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero section ────────────────────────────────────────── */}
      <section style={{ background: "#4b8ff4", position: "relative", overflow: "hidden", paddingBottom: 0 }}>
        {/* ambient orbs */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(75,143,244,0.18) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(75,143,244,0.14) 0%,transparent 70%)", pointerEvents: "none" }} />

        {/* back btn — absolute top-left */}
        <button onClick={() => navigate("/market")}
          style={{ position: "absolute", top: 20, left: 24, zIndex: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 999, padding: "6px 16px", color: "rgba(255,255,255,0.75)", fontSize: 13, cursor: "pointer", backdropFilter: "blur(4px)", transition: "background 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.15)"}
          onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
        >
          <FaChevronLeft style={{ fontSize: 11 }} /> กลับหน้าตลาดน้ำ
        </button>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "16px 32px 0" }}>
          {/* Title */}
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 10px" }}>ร้านค้าในตลาด</p>
          <h1 className="shop-hero-title" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 800, margin: "0 0 24px", lineHeight: 1.1, letterSpacing: "-0.02em", textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}>
            {marketName || "ตลาดน้ำ"}
          </h1>

          {/* Search bar — ตรงกลาง */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <div style={{ position: "relative", width: "100%", maxWidth: 480 }}>
              <FaMagnifyingGlass style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#94a3b8", pointerEvents: "none", zIndex: 2 }} />
              <input
                type="text" placeholder="ค้นหาร้านค้า..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", padding: "13px 20px 13px 46px", borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.97)", fontSize: 14, fontWeight: 500, color: "#0f172a", boxShadow: "0 4px 24px rgba(0,0,0,0.22)", outline: "none", transition: "box-shadow 0.2s" }}
                onFocus={e => e.target.style.boxShadow="0 4px 24px rgba(0,0,0,0.22), 0 0 0 3px rgba(75,143,244,0.18)"}
                onBlur={e => e.target.style.boxShadow="0 4px 24px rgba(0,0,0,0.22)"}
              />
            </div>
          </div>
        </div>

        {/* wave divider */}
        <svg viewBox="0 0 1440 40" style={{ display: "block", width: "100%" }} preserveAspectRatio="none">
          <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f4f5f7" />
        </svg>
      </section>

      {/* ── Grid ────────────────────────────────────────────────── */}
      <main className="rsp-main" style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            พบ <strong style={{ color: "#0f172a" }}>{filteredShops.length}</strong> ร้านค้า
            {searchTerm && <span style={{ marginLeft: 6, color: "#4b8ff4" }}>ตรงกับ "{searchTerm}"</span>}
          </p>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ appearance: "none", padding: "8px 32px 8px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E\") no-repeat right 10px center", fontSize: 13, fontWeight: 500, color: "#475569", cursor: "pointer", outline: "none" }}
          >
            <option value="open_first">🟢 เปิดก่อน</option>
            <option value="closed_first">🔴 ปิดก่อน</option>
            <option value="rating">⭐ คะแนนสูงสุด</option>
            <option value="name_az">ชื่อ A → Z</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 20 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ height: 180, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ height: 16, borderRadius: 6, background: "#f1f5f9", width: "60%" }} />
                  <div style={{ height: 12, borderRadius: 6, background: "#f8fafc" }} />
                </div>
              </div>
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#8d4d11" }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>⚠️</p>
            <p style={{ fontWeight: 600 }}>{error}</p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🏪</p>
            <p style={{ fontWeight: 600, fontSize: 16 }}>ไม่พบร้านค้าในตลาดน้ำนี้</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 20 }}>
            {filteredShops.map(shop => (
              <ShopCard
                key={shop.shop_id}
                shop={shop}
                ratingObj={shopRatings[shop.shop_id] || { avg: 0, count: 0 }}
                onProfile={() => navigate(`/shop-profile/${shop.shop_id}`)}
                onProducts={() => navigate(`/shop-product/${shop.shop_id}`)}
                locked={cartShopId && cartShopId !== String(shop.shop_id)}
              />
            ))}
          </div>
        )}
      </main>

      <FloatingCart />

      <Footer />
    </div>
  );
}

/* ─── Shop Card ──────────────────────────────────────────────────── */
function ShopCard({ shop, ratingObj, onProfile, onProducts, locked }) {
  const [hov, setHov] = useState(false);
  const name     = shop.shop_name || shop.description || shop.name || 'ร้านค้า';
  const initial  = name.trim().slice(0, 1).toUpperCase();
  const isClosed = shop.status !== 'Open';
  const disabled = locked || isClosed;
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 20, overflow: "hidden",
        boxShadow: hov ? "0 20px 48px rgba(0,0,0,0.13)" : "0 2px 12px rgba(0,0,0,0.07)",
        transform: hov && !disabled ? "translateY(-6px)" : "none",
        transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
        border: disabled ? "1.5px solid #e2e8f0" : "1px solid rgba(226,232,240,0.6)",
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {/* Image */}
      <div className="product-img" style={{ overflow: "hidden", position: "relative", flexShrink: 0, background: "#0f172a" }}>
        <img src={imgSrc(shop.image_url)} alt={name}
          onError={e => { e.target.onerror=null; e.target.src=SFALLBACK; }}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease", transform: hov ? "scale(1.06)" : "scale(1.0)" }}
        />
        {/* gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)", pointerEvents: "none" }} />

        {/* Rating top-right */}
        {ratingObj.avg > 0 && (
          <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(141,77,17,0.92)", backdropFilter: "blur(6px)", borderRadius: 999, padding: "4px 11px", display: "flex", alignItems: "center", gap: 5 }}>
            <FaStar style={{ color: "#fff", fontSize: 11 }} />
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>{ratingObj.avg.toFixed(1)}</span>
          </div>
        )}

        {/* Status badge top-left */}
        <div style={{ position: "absolute", top: 12, left: 12, background: isClosed ? "rgba(239,68,68,0.88)" : "rgba(34,197,94,0.88)", backdropFilter: "blur(6px)", borderRadius: 999, padding: "4px 11px", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{isClosed ? "ปิดชั่วคราว" : "เปิดให้บริการ"}</span>
        </div>

      </div>

      {/* Body */}
      <div style={{ padding: "16px 16px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", margin: "0 0 4px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{name}</h3>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <Stars rating={ratingObj.avg} />
          {ratingObj.count > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#8d4d11" }}>{ratingObj.avg.toFixed(1)}</span>
          )}
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{ratingObj.count > 0 ? `(${ratingObj.count})` : "ยังไม่มีรีวิว"}</span>
        </div>

        {isClosed && (
          <div style={{ marginBottom: 8, padding: "6px 10px", borderRadius: 8, background: "#fef2f2", border: "1px solid rgba(239,68,68,0.2)", fontSize: 11, color: "#dc2626", fontWeight: 600, textAlign: "center" }}>
            🔒 ร้านนี้ปิดให้บริการชั่วคราว
          </div>
        )}
        {locked && !isClosed && (
          <div style={{ marginBottom: 8, padding: "6px 10px", borderRadius: 8, background: "#fff0db", border: "1px solid rgba(141,77,17,0.2)", fontSize: 11, color: "#8d4d11", fontWeight: 600, textAlign: "center" }}>
            🔒 มีสินค้าในตะกร้าจากร้านอื่นอยู่แล้ว
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
          <button onClick={onProfile}
            style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1.5px solid #8d4d11", background: "#fff", color: "#8d4d11", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.background="#8d4d11"; e.currentTarget.style.color="#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.color="#8d4d11"; }}
          >โปรไฟล์</button>
          <button
            onClick={disabled ? undefined : onProducts}
            disabled={disabled}
            style={{ flex: 2, padding: "10px 0", borderRadius: 12, border: "none", background: disabled ? "#e2e8f0" : "#4b8ff4", color: disabled ? "#94a3b8" : "#fff", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 3px 10px rgba(75,143,244,0.28)", transition: "all 0.18s" }}
            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background="#2d6fd4"; e.currentTarget.style.boxShadow="0 6px 18px rgba(75,143,244,0.42)"; } }}
            onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background="#4b8ff4"; e.currentTarget.style.boxShadow="0 3px 10px rgba(75,143,244,0.28)"; } }}
          >{isClosed ? "ร้านปิดชั่วคราว" : locked ? "🔒 เข้าร้าน" : "เข้าร้าน"}</button>
        </div>
      </div>
    </div>
  );
}
