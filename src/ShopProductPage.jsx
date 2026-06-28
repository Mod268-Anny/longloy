// ============================================================
// ShopProductPage.jsx — หน้าสินค้าของร้าน (พร้อมเพิ่มตะกร้า)
//
// หน้าที่: แสดงสินค้าทั้งหมดของร้านค้าตาม :shop_id พร้อมฟีเจอร์ครบ
//
// ส่วนที่มี:
//   - รายละเอียดร้าน + รูปหน้าร้าน
//   - ค้นหาสินค้า + กรองตามหมวดหมู่
//   - เพิ่มลงตะกร้า (localStorage) + sync กับ backend
//   - รีวิวร้านค้า + ฟอร์มเขียนรีวิว
//   - cart sidebar
//
// เส้นทาง: /shop-product/:shop_id
// ============================================================
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  FaBasketShopping,
  FaMagnifyingGlass, FaStar, FaCartPlus, FaChevronLeft, FaChevronDown,
} from "react-icons/fa6";
import Footer from "./Footer";
import FloatingCart from './FloatingCart';
import { FaUserCircle } from "react-icons/fa";
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from "react-icons/md";
import { syncCartToBackend } from "./api/syncCartToBackend";
import API_URL, { secureLocalFetch, resolveImg } from "./config";

/* ─── constants ─────────────────────────────────────────────────── */
const NAV = [
  { label: "หน้าแรก",   icon: <MdHome size={18}/>,                path: "/homepage" },
  { label: "ตลาดน้ำ",   icon: <MdStorefront size={18}/>,           path: "/market"   },
  { label: "เกม",       icon: <MdOutlineSportsEsports size={18}/>, path: "/game"     },
  { label: "ช่วยเหลือ", icon: <MdHelpOutline size={18}/>,          path: "/help"     },
];

const PFALLBACK = "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80";
const imgSrc = (url) => resolveImg(url, PFALLBACK);

/* ─── helpers ───────────────────────────────────────────────────── */
const avgOf = (reviews) =>
  reviews?.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;

/* ═══════════════════════════════════════════════════════════════ */
export default function ShopProductPage() {
  const { shop_id } = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();

  /* data */
  const [shop,           setShop]           = useState(null);
  const [shopLoading,    setShopLoading]     = useState(true);
  const [products,       setProducts]       = useState([]);
  const [productReviews, setProductReviews] = useState({});
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  /* filters */
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy,     setSortBy]     = useState("default");
  const [priceRange, setPriceRange] = useState({ min: 0, max: 999999 });
  const [minRating,  setMinRating]  = useState(0);
  const [filtered,   setFiltered]   = useState([]);

  /* cart */
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cart")) || []; } catch { return []; }
  });
  const [addedSet, setAddedSet] = useState(new Set());

  /* ── fetch shop & products ───────────────────────────────────── */
  useEffect(() => {
    if (!shop_id) return;

    /* shop info */
    setShopLoading(true);
    secureLocalFetch(`${API_URL}/shops/${shop_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setShop(d); setShopLoading(false); })
      .catch(() => setShopLoading(false));

    /* products + reviews */
    setLoading(true);
    secureLocalFetch(`${API_URL}/products/by-shop/${shop_id}`)
      .then(r => { if (!r.ok) throw new Error("Failed to fetch products"); return r.json(); })
      .then(async data => {
        setProducts(data);
        const reviewsObj = {};
        await Promise.all(data.map(async p => {
          try {
            const r = await secureLocalFetch(`${API_URL}/product-reviews/${p.product_id}`);
            reviewsObj[p.product_id] = r.ok ? await r.json() : [];
          } catch { reviewsObj[p.product_id] = []; }
        }));
        setProductReviews(reviewsObj);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [shop_id]);

  /* ── apply filters ───────────────────────────────────────────── */
  useEffect(() => {
    let r = products.filter(p => {
      const q = searchTerm.toLowerCase();
      if (q && !(p.name || "").toLowerCase().includes(q) && !(p.description || "").toLowerCase().includes(q)) return false;
      const price = p.price || 0;
      if (price < priceRange.min || price > priceRange.max) return false;
      if (avgOf(productReviews[p.product_id]) < minRating) return false;
      return true;
    });
    if (sortBy === "price_low")    r.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortBy === "price_high")   r.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sortBy === "rating_high")  r.sort((a, b) => avgOf(productReviews[b.product_id]) - avgOf(productReviews[a.product_id]));
    if (sortBy === "rating_low")   r.sort((a, b) => avgOf(productReviews[a.product_id]) - avgOf(productReviews[b.product_id]));
    if (sortBy === "name_az")      r.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    // เปิดอยู่ขึ้นก่อน ปิดอยู่ลงท้าย (stable — รักษาลำดับ sort อื่นๆ ภายใน group)
    r.sort((a, b) => (b.is_available ? 1 : 0) - (a.is_available ? 1 : 0));
    setFiltered(r);
  }, [products, productReviews, searchTerm, sortBy, priceRange, minRating]);

  /* ── add to cart (1 ร้าน / 1 ตลาดน้ำ ต่อ 1 ใบเสร็จ) ────────── */
  const addToCart = (product) => {
    if (!localStorage.getItem('token')) { navigate('/login'); return; }
    setCart(prev => {
      // ตรวจสอบว่า cart มีสินค้าจากร้านอื่นอยู่หรือไม่
      const existingShopId = prev.length > 0 ? prev[0].shop_id : null;
      if (existingShopId && String(existingShopId) !== String(shop_id)) {
        const existingShopName = prev[0].shop_name || `ร้าน #${existingShopId}`;
        const currentShopName  = shop?.shop_name || shop?.description || `ร้าน #${shop_id}`;
        const ok = window.confirm(
          `ตะกร้าของคุณมีสินค้าจาก "${existingShopName}" อยู่แล้ว\n\nต้องการล้างตะกร้าและเพิ่มสินค้าจาก "${currentShopName}" แทนหรือไม่?`
        );
        if (!ok) return prev; // ยกเลิก — ไม่เปลี่ยนแปลง
        // ยืนยัน — ล้างตะกร้าเดิมแล้วเพิ่มสินค้าใหม่
        const freshItem = {
          product_id: product.product_id,
          name: product.name,
          price: product.price,
          unit: product.unit || null,
          img: product.image_url,
          qty: 1,
          shop_id: Number(shop_id),
          shop_name: shop?.shop_name || shop?.description || '',
          market_id: shop?.market_id || null,
          market_name: shop?.market_name || '',
        };
        const next = [freshItem];
        localStorage.setItem("cart", JSON.stringify(next)); window.dispatchEvent(new Event("cart-updated"));
        const token = localStorage.getItem("token");
        if (token) syncCartToBackend(next, token);
        setAddedSet(p => { const s = new Set(p); s.add(product.product_id); return s; });
        setTimeout(() => setAddedSet(p => { const s = new Set(p); s.delete(product.product_id); return s; }), 1200);
        return next;
      }

      // ร้านเดียวกัน — เพิ่มปกติ
      const found = prev.find(i => i.product_id === product.product_id);
      const next  = found
        ? prev.map(i => i.product_id === product.product_id ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, {
            product_id: product.product_id,
            name: product.name,
            price: product.price,
            unit: product.unit || null,
            img: product.image_url,
            qty: 1,
            shop_id: Number(shop_id),
            shop_name: shop?.shop_name || shop?.description || '',
            market_id: shop?.market_id || null,
            market_name: shop?.market_name || '',
          }];
      localStorage.setItem("cart", JSON.stringify(next)); window.dispatchEvent(new Event("cart-updated"));
      const token = localStorage.getItem("token");
      if (token) syncCartToBackend(next, token);
      return next;
    });
    setAddedSet(prev => { const s = new Set(prev); s.add(product.product_id); return s; });
    setTimeout(() => setAddedSet(prev => { const s = new Set(prev); s.delete(product.product_id); return s; }), 1200);
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const resetFilters = () => { setSortBy("default"); setPriceRange({ min: 0, max: 999999 }); setMinRating(0); setSearchTerm(""); };

  /* ══════════════════════════════ RENDER ════════════════════════ */
  const shopName = shop?.shop_name || shop?.description || "ร้านค้า";
  const initial  = shopName.trim().slice(0, 1).toUpperCase();

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f4f5f7", minHeight: "100vh", color: "#0f172a" }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes signGlow{0%,100%{box-shadow:0 0 24px rgba(251,191,36,0.35),0 8px 32px rgba(0,0,0,0.25)}50%{box-shadow:0 0 40px rgba(251,191,36,0.55),0 8px 32px rgba(0,0,0,0.25)}}
      `}</style>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="rsp-header-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => navigate("/cart")} style={{ position: "relative", width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fas fa-basket-shopping" style={{ fontSize: 17 }} />
              {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#8d4d11", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount > 9 ? "9+" : cartCount}</span>}
            </button>
            <button onClick={() => navigate("/profile")} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fas fa-user-circle" style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Store Hero ──────────────────────────────────────────────── */}
      <section className="spp-hero" style={{ position: "relative", overflow: "hidden", paddingBottom: 0 }}>
        <style>{`
          .spp-hero { min-height: 310px; }
          @media (max-width: 640px) {
            .spp-hero { min-height: 240px; }
            .spp-hero-avatar { width: 72px !important; height: 72px !important; border-radius: 16px !important; }
            .spp-hero-name { font-size: 1.35rem !important; }
            .spp-hero-pad { padding: 0 14px 22px !important; }
          }
        `}</style>

        {/* Background: shop image + overlay OR dark-brown gradient */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {shop?.image_url ? (
            <>
              <img src={resolveImg(shop.image_url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%" }} onError={e => { e.target.style.display = "none"; }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(12,5,1,0.38) 0%, rgba(6,2,0,0.86) 100%)" }} />
            </>
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1a0700 0%, #5c2c08 45%, #8d4d11 100%)" }} />
          )}
          {/* decorative circles */}
          <div style={{ position: "absolute", top: -80, right: -60, width: 280, height: 280, borderRadius: "50%", background: "rgba(251,191,36,0.06)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -40, left: "25%", width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />
        </div>

        {/* Overlay content — flex column, info anchored at bottom */}
        <div style={{ position: "relative", zIndex: 1, minHeight: 310, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>

          {/* Back button */}
          <button onClick={() => navigate(-1)}
            style={{ position: "absolute", top: 20, left: 24, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 999, padding: "7px 18px", color: "rgba(255,255,255,0.88)", fontSize: 13, cursor: "pointer", backdropFilter: "blur(6px)", transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.18)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.1)"}
          >
            <FaChevronLeft style={{ fontSize: 11 }} /> กลับ
          </button>

          {/* Bottom info strip */}
          <div className="spp-hero-pad" style={{ maxWidth: 1280, width: "100%", margin: "0 auto", padding: "0 28px 38px", display: "flex", alignItems: "flex-end", gap: 20 }}>

            {/* Avatar */}
            <div className="spp-hero-avatar" style={{
              flexShrink: 0, width: 96, height: 96, borderRadius: 22,
              border: "3px solid rgba(251,191,36,0.72)",
              background: "linear-gradient(135deg,#6b3a0d,#3d1a05)",
              overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 28px rgba(251,191,36,0.28), 0 8px 32px rgba(0,0,0,0.55)",
              animation: "signGlow 3s ease-in-out infinite",
            }}>
              {shopLoading ? (
                <div style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.12)", animation: "pulse 1.5s infinite" }} />
              ) : shop?.image_url ? (
                <img src={resolveImg(shop.image_url)} alt={shopName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 38, fontWeight: 900, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{initial}</span>
              )}
            </div>

            {/* Text */}
            <div style={{ flex: 1, paddingBottom: 2 }}>
              {/* Badges */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9, flexWrap: "wrap" }}>
                <span style={{ background: "linear-gradient(135deg,#8d4d11,#6b3a0d)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 11px", borderRadius: 999, letterSpacing: "0.1em", textTransform: "uppercase" }}>ร้านค้า</span>
                {shop?.status === 'Open'
                  ? <span style={{ background: "rgba(34,197,94,0.18)", color: "#4ade80", fontSize: 10, fontWeight: 700, padding: "3px 11px", borderRadius: 999, border: "1px solid rgba(34,197,94,0.38)" }}>● เปิดให้บริการ</span>
                  : <span style={{ background: "rgba(239,68,68,0.18)", color: "#f87171", fontSize: 10, fontWeight: 700, padding: "3px 11px", borderRadius: 999, border: "1px solid rgba(239,68,68,0.35)" }}>● ปิดชั่วคราว</span>
                }
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.42)" }}>{products.length} รายการสินค้า</span>
              </div>
              {/* Shop name */}
              <h1 className="spp-hero-name" style={{ margin: "0 0 7px", fontWeight: 900, color: "#fff", fontSize: "clamp(1.55rem,4vw,2.6rem)", letterSpacing: "-0.02em", textShadow: "0 2px 16px rgba(0,0,0,0.5)", lineHeight: 1.1 }}>
                {shopName}
              </h1>
              {/* Market */}
              {shop?.market_name && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.52)", fontSize: 13 }}>
                  <span>📍</span><span>{shop.market_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <svg viewBox="0 0 1440 40" style={{ display: "block", width: "100%", position: "relative", zIndex: 1, marginTop: -1 }} preserveAspectRatio="none">
          <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f4f5f7" />
        </svg>
      </section>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="rsp-main" style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 80px" }}>

        {/* Shop closed banner */}
        {shop && shop.status !== 'Open' && (
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            background: "linear-gradient(135deg,#fff1f2,#ffe4e6)",
            border: "1.5px solid #fecaca", borderRadius: 16,
            padding: "16px 22px", marginBottom: 20,
            boxShadow: "0 2px 12px rgba(239,68,68,0.1)",
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fef2f2", border: "1.5px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 20 }}>🔒</span>
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#dc2626" }}>ร้านนี้ปิดให้บริการชั่วคราว</p>
              <p style={{ margin: "3px 0 0", fontSize: 13, color: "#ef4444" }}>ขณะนี้ไม่สามารถสั่งซื้อสินค้าได้ กรุณากลับมาใหม่ในภายหลัง</p>
            </div>
          </div>
        )}

        {/* Search + filter bar */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #eef1f6", padding: "16px 20px", marginBottom: 24, boxShadow: "0 2px 14px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Search — full width */}
          <div style={{ position: "relative" }}>
            <FaMagnifyingGlass style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 13 }} />
            <input type="text" placeholder="ค้นหาสินค้าในร้านนี้..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "10px 14px 10px 38px", borderRadius: 12, border: "1.5px solid #e8edf3", fontSize: 14, outline: "none", background: "#f8fafc", boxSizing: "border-box", transition: "border 0.15s" }}
              onFocus={e => e.target.style.borderColor = "#8d4d11"}
              onBlur={e => e.target.style.borderColor = "#e8edf3"}
            />
          </div>

          {/* Filters row — scrollable on mobile */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>

            {/* Sort */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ appearance: "none", padding: "8px 30px 8px 13px", borderRadius: 10, border: "1.5px solid #e8edf3", background: sortBy !== "default" ? "#fff8f0" : "#fff", fontSize: 13, fontWeight: 500, color: sortBy !== "default" ? "#8d4d11" : "#475569", cursor: "pointer", outline: "none", transition: "all 0.15s" }}>
                <option value="default">เรียงตาม</option>
                <option value="price_low">ราคาต่ำ → สูง</option>
                <option value="price_high">ราคาสูง → ต่ำ</option>
                <option value="rating_high">⭐ สูงสุดก่อน</option>
                <option value="rating_low">⭐ ต่ำสุดก่อน</option>
                <option value="name_az">ชื่อ A → Z</option>
              </select>
              <FaChevronDown style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "#94a3b8", pointerEvents: "none" }} />
            </div>

            {/* Price range */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b" }}>
              <span style={{ fontWeight: 700, color: "#8d4d11" }}>฿</span>
              <input type="number" placeholder="ต่ำสุด" value={priceRange.min || ""} onChange={e => setPriceRange(p => ({ ...p, min: parseInt(e.target.value) || 0 }))}
                style={{ width: 68, padding: "8px 8px", borderRadius: 10, border: "1.5px solid #e8edf3", fontSize: 13, outline: "none", textAlign: "center" }}
                onFocus={e => e.target.style.borderColor = "#8d4d11"}
                onBlur={e => e.target.style.borderColor = "#e8edf3"}
              />
              <span style={{ color: "#cbd5e1" }}>—</span>
              <input type="number" placeholder="สูงสุด" value={priceRange.max === 999999 ? "" : priceRange.max} onChange={e => setPriceRange(p => ({ ...p, max: parseInt(e.target.value) || 999999 }))}
                style={{ width: 68, padding: "8px 8px", borderRadius: 10, border: "1.5px solid #e8edf3", fontSize: 13, outline: "none", textAlign: "center" }}
                onFocus={e => e.target.style.borderColor = "#8d4d11"}
                onBlur={e => e.target.style.borderColor = "#e8edf3"}
              />
            </div>

            {/* Min rating */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <select value={minRating} onChange={e => setMinRating(parseInt(e.target.value))}
                style={{ appearance: "none", padding: "8px 30px 8px 13px", borderRadius: 10, border: "1.5px solid #e8edf3", background: minRating > 0 ? "#fff8f0" : "#fff", fontSize: 13, fontWeight: 500, color: minRating > 0 ? "#8d4d11" : "#475569", cursor: "pointer", outline: "none", transition: "all 0.15s" }}>
                <option value={0}>ทุกระดับดาว</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>★ {n}+ ขึ้นไป</option>)}
              </select>
              <FaChevronDown style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "#94a3b8", pointerEvents: "none" }} />
            </div>

            {/* Reset */}
            <button onClick={resetFilters}
              style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e8edf3", background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#8d4d11"; e.currentTarget.style.color = "#8d4d11"; e.currentTarget.style.background = "#fff8f0"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8edf3"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "#fff"; }}
            >
              ↺ รีเซ็ต
            </button>
          </div>
        </div>

        {/* Closed shop banner */}
        {!shopLoading && shop?.status !== 'Open' && (
          <div style={{ marginBottom: 20, padding: "16px 20px", borderRadius: 14, background: "#fef2f2", border: "1.5px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>🔒</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#dc2626" }}>ร้านนี้ปิดให้บริการชั่วคราว</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#ef4444" }}>ไม่สามารถสั่งซื้อสินค้าได้ในขณะนี้</p>
            </div>
          </div>
        )}

        {/* Result count */}
        {!loading && !error && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
              แสดง <strong style={{ color: "#0f172a" }}>{filtered.length}</strong> จาก <strong style={{ color: "#0f172a" }}>{products.length}</strong> รายการ
            </p>
            {filtered.length !== products.length && (
              <button onClick={resetFilters} style={{ fontSize: 12, color: "#8d4d11", background: "#fff8f0", border: "1px solid rgba(141,77,17,0.2)", borderRadius: 999, padding: "4px 12px", cursor: "pointer", fontWeight: 600 }}>
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}

        {/* ── States ───────────────────────────────────────────── */}
        {loading ? (
          <div className="rsp-grid-auto" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 20 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ height: 180, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ height: 14, borderRadius: 6, background: "#f1f5f9", width: "70%" }} />
                  <div style={{ height: 12, borderRadius: 6, background: "#f8fafc" }} />
                  <div style={{ height: 12, borderRadius: 6, background: "#f8fafc", width: "50%" }} />
                </div>
              </div>
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#8d4d11" }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>⚠️</p>
            <p style={{ fontWeight: 600, fontSize: 16 }}>{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🏪</p>
            <p style={{ fontWeight: 600, fontSize: 16 }}>ร้านนี้ยังไม่มีสินค้า</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
            <p style={{ fontWeight: 600, fontSize: 16 }}>ไม่พบสินค้าตามเงื่อนไข</p>
            <button onClick={resetFilters} style={{ marginTop: 16, padding: "9px 24px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#475569" }}>
              ล้างตัวกรอง
            </button>
          </div>
        ) : (
          /* ── Product grid ──────────────────────────────────── */
          <div className="rsp-grid-auto" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 20 }}>
            {filtered.map(product => {
              const reviews = productReviews[product.product_id] || [];
              const avg     = avgOf(reviews);
              const isAdded = addedSet.has(product.product_id);
              return (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  avg={avg}
                  reviewCount={reviews.length}
                  isAdded={isAdded}
                  shopClosed={shop?.status !== 'Open'}
                  productClosed={!product.is_available}
                  onAdd={() => addToCart(product)}
                  onView={() => navigate(`/product/${product.product_id}`)}
                />
              );
            })}
          </div>
        )}
      </main>

      <FloatingCart />

      <Footer />
    </div>
  );
}

/* ─── Product Card ───────────────────────────────────────────────── */
function ProductCard({ product, avg, reviewCount, isAdded, shopClosed, productClosed, onAdd, onView }) {
  const [hov, setHov] = useState(false);
  const isClosed = shopClosed || productClosed;
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 20, overflow: "hidden",
        boxShadow: hov && !isClosed ? "0 20px 48px rgba(0,0,0,0.13)" : "0 2px 12px rgba(0,0,0,0.06)",
        transform: hov && !isClosed ? "translateY(-6px)" : "none",
        transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
        border: isClosed ? "1.5px solid #fecaca" : "1px solid #f1f5f9",
        opacity: isClosed ? 0.78 : 1,
      }}
    >
      {/* Image */}
      <div onClick={onView} className="product-img" style={{ cursor: "pointer", flexShrink: 0, background: "#f1f5f9", position: "relative" }}>
        <img
          src={imgSrc(product.image_url)} alt={product.name}
          onError={e => { e.target.onerror = null; e.target.src = PFALLBACK; }}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease", transform: hov && !isClosed ? "scale(1.06)" : "scale(1.0)", filter: isClosed ? "grayscale(40%)" : "none" }}
        />
        {/* Unavailable overlay badge */}
        {productClosed && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.32)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 800, padding: "6px 16px", borderRadius: 999, letterSpacing: "0.05em", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
              ปิดการขาย
            </span>
          </div>
        )}
        {/* Rating badge top-left */}
        {avg > 0 && !productClosed && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", borderRadius: 999, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
            <FaStar style={{ color: "#8d4d11", fontSize: 11 }} />
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{avg.toFixed(1)}</span>
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>({reviewCount})</span>
          </div>
        )}
        {/* Price tag bottom-left */}
        {!productClosed && (
          <div style={{ position: "absolute", bottom: 10, left: 12, display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ background: "linear-gradient(135deg,#6b3a0d,#8d4d11)", color: "#fff", fontWeight: 800, fontSize: 15, padding: "5px 14px", borderRadius: 999, boxShadow: "0 3px 10px rgba(0,0,0,0.25)" }}>
              ฿{Number(product.price || 0).toLocaleString()}
            </span>
            {product.unit && (
              <span style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 999 }}>
                / {product.unit}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "16px 16px 18px", display: "flex", flexDirection: "column", flex: 1, textAlign: "center" }}>
        <p
          onClick={onView}
          style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", margin: "0 0 4px", cursor: "pointer", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", transition: "color 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "#6b3a0d"}
          onMouseLeave={e => e.currentTarget.style.color = "#0f172a"}
        >
          {product.name || "สินค้า"}
        </p>

        {/* Price + Unit (text row below name) */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: "#8d4d11" }}>
            ฿{Number(product.price || 0).toLocaleString()}
          </span>
          {product.unit && (
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>/ {product.unit}</span>
          )}
        </div>

        <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.55, flex: 1, margin: "0 0 14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {product.description || ""}
        </p>

        <button
          onClick={isClosed ? undefined : onAdd}
          disabled={isClosed}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "12px", borderRadius: 999, border: "none", fontSize: 14, fontWeight: 700,
            cursor: isClosed ? "not-allowed" : "pointer",
            background: isClosed ? "#e2e8f0" : isAdded ? "linear-gradient(135deg,#4b8ff4,#2d6fd4)" : "linear-gradient(135deg,#8d4d11,#8d4d11)",
            color: isClosed ? "#94a3b8" : "#fff",
            transition: "all 0.2s",
            boxShadow: isClosed ? "none" : isAdded ? "0 4px 14px rgba(75,143,244,0.35)" : "0 4px 16px rgba(141,77,17,0.35)",
            transform: isAdded ? "scale(0.98)" : "scale(1)",
          }}
        >
          <FaCartPlus style={{ fontSize: 14 }} />
          {isClosed ? "ไม่พร้อมจำหน่าย" : isAdded ? "✓ เพิ่มลงตะกร้าแล้ว" : "เพิ่มลงตะกร้า"}
        </button>
      </div>
    </div>
  );
}
