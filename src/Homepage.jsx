// ============================================================
// Homepage.jsx — หน้าแรกของแอป (หน้า Landing หลัก)
//
// ส่วนประกอบ:
//   1. Navbar        — แถบด้านบน (built-in ไม่ใช้ component แยก)
//   2. Hero Section  — สไลด์รูปตลาดน้ำ + ปุ่ม CTA
//   3. Products      — แสดงสินค้าทุกร้าน กรองตามตลาด + ค้นหา + paginate
//   4. Gamification  — การ์ดแนะนำเกม 3 ประเภท
//   5. Cart Sidebar  — ตะกร้าแบบ slide-in (overlay)
//   6. FloatingCart  — ไอคอนตะกร้าลอยตัว (mobile-friendly)
//
// Data flow:
//   markets → shops/by-market → products/by-shop (cascade fetch)
//   ตะกร้า sync กับ localStorage + ยิง custom event "cart-updated"
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaShip, FaXmark, FaTrashCan, FaCartPlus, FaPersonWalking, FaBasketShopping, FaBrain, FaGamepad, FaBullseye, FaWater,
  FaLocationDot, FaMagnifyingGlass, FaChevronRight,
  FaChevronLeft,
} from "react-icons/fa6";

import {
  MdHome, MdStorefront, MdOutlineSportsEsports,
  MdHelpOutline, MdArrowOutward,
} from "react-icons/md";
import { FaUserCircle } from "react-icons/fa";
import Footer from "./Footer";
import FloatingCart from './FloatingCart';
import API_URL, { secureLocalFetch, resolveImg } from "./config";

/* ─── utils ─────────────────────────────────────────────────────── */
const img = (url, fb = "https://images.unsplash.com/photo-1552410260-0fd9b577afa6?w=1200&q=80") =>
  resolveImg(url, fb);

const PFALLBACK = "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80";
const MFALLBACK = "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=800&q=80";
const OPEN_DAYS = ["เสาร์-อาทิตย์", "เสาร์-อาทิตย์", "ทุกวัน", "เสาร์-อาทิตย์", "ทุกวัน", "ทุกวัน"];

const GAMES = [
  { icon: <FaPersonWalking />, label: "เก็บคะแนนสะสม",           sub: "จากการซื้อของหรือทำภารกิจ", path: "/game?game=stepCounter", col: "#6b3a0d" },
  { icon: <FaBasketShopping />, label: "ซื้อจากร้านที่เพิ่งเข้าร่วม", sub: "เพื่อส่วนลดพิเศษ",            path: "/game?game=buyProduct",  col: "#8d4d11" },
  { icon: <FaBrain />, label: "ตอบคำถาม",                   sub: "คำถามจะเด้งขึ้นระหว่างทาง",   path: "/game?game=quiz",         col: "#4b8ff4" },
];

/* ═══════════════════════════════════════════════════════════════ */
export default function Homepage() {
  const navigate = useNavigate();
  const location = useLocation();

  /* hero */
  const [heroData,  setHeroData]  = useState([]);
  const [heroIdx,   setHeroIdx]   = useState(0);
  const [fade,      setFade]      = useState(true);

  /* data */
  const [markets,         setMarkets]         = useState([]);
  const [products,        setProducts]        = useState([]);
  const [loadingMarkets,  setLoadingMarkets]  = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  /* search */
  const [srchTerm,   setSrchTerm]   = useState("");
  const [allMarkets, setAllMarkets] = useState([]);
  const [dropdown,   setDropdown]   = useState([]);
  const dropRef = useRef(null);

  /* filter + product search + pagination */
  const [filter,     setFilter]     = useState("ทั้งหมด");
  const [prodSrch,   setProdSrch]   = useState("");
  const [prodPage,   setProdPage]   = useState(1);
  const PROD_PER_PAGE = 9;

  /* cart — sync with localStorage so Cart.jsx reads the same data */
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')) || []; }
    catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);

  /* nav */
  const NAV = [
    { label: "หน้าแรก", icon: <MdHome size={18}/>,                  path: "/homepage" },
    { label: "ตลาดน้ำ", icon: <MdStorefront size={18}/>,             path: "/market"   },
    { label: "เกม",     icon: <MdOutlineSportsEsports size={18}/>,   path: "/game"     },
    { label: "ช่วยเหลือ",icon: <MdHelpOutline size={18}/>,           path: "/help"     },
  ];

  /* ── fetch hero ─────────────────────────────────────────────── */
  useEffect(() => {
    secureLocalFetch(`${API_URL}/floating-markets/search?q=`)
      .then(r => r.json())
      .then(d => setHeroData(
        Array.isArray(d) ? d.map(m => ({ title: m.name, image: m.image_url, desc: m.description, id: m.market_id })) : []
      )).catch(() => {});
  }, []);

  useEffect(() => {
    if (!heroData.length) return;
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setHeroIdx(p => (p + 1) % heroData.length); setFade(true); }, 250);
    }, 4500);
    return () => clearInterval(t);
  }, [heroData]);

  const slide = (dir) => {
    setFade(false);
    setTimeout(() => {
      setHeroIdx(p => dir === "prev" ? (p - 1 + heroData.length) % heroData.length : (p + 1) % heroData.length);
      setFade(true);
    }, 250);
  };

  /* ── fetch markets ───────────────────────────────────────────── */
  useEffect(() => {
    secureLocalFetch(`${API_URL}/floating-markets/all`)
      .then(r => r.json())
      .then(d => { const a = Array.isArray(d) ? d : []; setMarkets(a); setAllMarkets(a); })
      .catch(() => {})
      .finally(() => setLoadingMarkets(false));
  }, []);

  /* ── cascade: markets → shops → products ────────────────────── */
  useEffect(() => {
    if (!markets.length) return;
    setLoadingProducts(true);
    const go = async (m) => {
      try {
        const shops = await secureLocalFetch(`${API_URL}/shops/by-market/${m.market_id}`).then(r => r.json());
        if (!Array.isArray(shops) || !shops.length) return [];
        const lists = await Promise.all(
          shops.map(s =>
            secureLocalFetch(`${API_URL}/products/by-shop/${s.shop_id}`)
              .then(r => r.json())
              .then(ps => Array.isArray(ps) ? ps.map(p => ({ ...p, shop_id: s.shop_id, market_name: m.name, market_id: m.market_id })) : [])
              .catch(() => [])
          )
        );
        return lists.flat();
      } catch { return []; }
    };
    Promise.all(markets.map(go)).then(r => setProducts(r.flat())).finally(() => setLoadingProducts(false));
  }, [markets]);

  /* ── search dropdown ─────────────────────────────────────────── */
  useEffect(() => {
    if (!srchTerm.trim()) { setDropdown([]); return; }
    setDropdown(allMarkets.filter(m => m.name?.toLowerCase().includes(srchTerm.toLowerCase())).slice(0, 5));
  }, [srchTerm, allMarkets]);

  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropdown([]); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── cart ────────────────────────────────────────────────────── */
  const saveCart = (next) => {
    localStorage.setItem('cart', JSON.stringify(next));
    window.dispatchEvent(new Event('cart-updated'));
    return next;
  };

  const addToCart = useCallback((p) => {
    if (!localStorage.getItem('token')) { navigate('/login'); return; }
    setCart(prev => {
      const existingShopId = prev.length > 0 ? prev[0].shop_id : null;
      if (existingShopId && String(existingShopId) !== String(p.shop_id)) {
        const existingName = prev[0].shop_name || `ร้าน #${existingShopId}`;
        const ok = window.confirm(`ตะกร้ามีสินค้าจาก "${existingName}" อยู่แล้ว\nต้องการล้างตะกร้าและเพิ่มสินค้าจากร้านใหม่แทนหรือไม่?`);
        if (!ok) return prev;
        return saveCart([{ ...p, qty: 1 }]);
      }
      const f = prev.find(i => i.product_id === p.product_id);
      const next = f
        ? prev.map(i => i.product_id === p.product_id ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, { ...p, qty: 1 }];
      return saveCart(next);
    });
    setCartOpen(true);
  }, [navigate]);

  const removeItem = useCallback(id => setCart(prev => saveCart(prev.filter(i => i.product_id !== id))), []);
  const changeQty  = useCallback((id, d) =>
    setCart(prev => saveCart(prev.map(i => i.product_id === id ? { ...i, qty: i.qty + d } : i).filter(i => i.qty > 0))), []);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + Number(i.price ?? 0) * i.qty, 0);

  /* ── derived ─────────────────────────────────────────────────── */
  const filterOpts  = ["ทั้งหมด", ...markets.map(m => m.name)];
  const allVisProd = products
    .filter(p => filter === "ทั้งหมด" || p.market_name === filter)
    .filter(p => !prodSrch || p.name?.toLowerCase().includes(prodSrch.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(allVisProd.length / PROD_PER_PAGE));
  const visProd    = allVisProd.slice((prodPage - 1) * PROD_PER_PAGE, prodPage * PROD_PER_PAGE);

  /* reset page on filter/search change */
  const setFilterReset = (v) => { setFilter(v); setProdPage(1); };
  const setProdSrchReset = (v) => { setProdSrch(v); setProdPage(1); };

  /* ════════════════════════════════ RENDER ══════════════════════ */
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#0f172a" }}>

      {/* ╔══════════════════════════════════════════════════════╗ */}
      {/* ║                     NAVBAR                          ║ */}
      {/* ╚══════════════════════════════════════════════════════╝ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <div className="rsp-header-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

          {/* Logo */}
          <button onClick={() => navigate("/homepage")} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}>
            <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height: 45, width: "auto", objectFit: "contain" }} />
          </button>

          {/* Nav links */}
          <nav className="rsp-desktop-nav" style={{ display: "flex", gap: 4 }}>
            {NAV.map(n => {
              const active = location.pathname === n.path;
              return (
                <button key={n.label} onClick={() => navigate(n.path)} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                  borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400,
                  background: active ? "#edf3ff" : "transparent",
                  color: active ? "#4b8ff4" : "#475569",
                  transition: "all 0.15s",
                }}>
                  {n.icon} <span className="rsp-nav-label">{n.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: cart + profile */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Cart toggle — SINGLE cart button */}
            <button onClick={() => localStorage.getItem('token') ? setCartOpen(v => !v) : navigate('/login')} style={{
              position: "relative", width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0",
              background: "#fff", color: "#64748b", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
            }}>
              <i className="fas fa-basket-shopping" style={{ fontSize: 17 }} />
              {cartCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%",
                  background: "#8d4d11", color: "#fff", fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            {/* Profile */}
            <button onClick={() => navigate(localStorage.getItem('token') ? "/profile" : "/login")} style={{
              width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0",
              background: "#fff", color: "#64748b", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
            }}>
              <i className="fas fa-user-circle" style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      </header>

      {/* ╔══════════════════════════════════════════════════════╗ */}
      {/* ║                      HERO                           ║ */}
      {/* ╚══════════════════════════════════════════════════════╝ */}
      <section style={{ position: "relative", height: "100vh", minHeight: 560, overflow: "hidden", background: "#080c10" }}>
        <style>{`
          @keyframes heroZoom { from { transform: scale(1.08); } to { transform: scale(1); } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
          .hero-title { color: #ffffff !important; }
          .hero-desc  { color: #ffffff !important; }
          .hero-eye   { color: rgba(255,255,255,0.75) !important; }
          .game-title { color: #0f172a !important; }
          .game-btn   { color: #ffffff !important; }
          .pg-btn     { color: #475569 !important; }
          .pg-btn:disabled { color: #cbd5e1 !important; }
        `}</style>

        {/* BG image with Ken Burns zoom */}
        {heroData.length > 0 && (
          <img
            key={heroIdx}
            src={img(heroData[heroIdx].image)}
            alt=""
            onError={e => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1552410260-0fd9b577afa6?w=1200&q=80"; }}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              opacity: fade ? 1 : 0, transition: "opacity 0.9s ease",
              animation: "heroZoom 6s ease forwards",
              filter: "brightness(0.55) saturate(0.85)",
            }}
          />
        )}

        {/* Overlays — cinematic vignette (darkens right side) */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.08) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 45%)" }} />

        {/* Content — lower-left layout */}
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 0 80px 0" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", padding: "0 56px" }}>
            <div style={{ textAlign: "left" }}>

            {/* Big title */}
            <h1 className="hero-title" style={{
              fontSize: "clamp(2rem, 4.5vw, 4rem)", fontWeight: 700,
              lineHeight: 1.15, margin: "0 0 28px", letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              opacity: fade ? 1 : 0, transition: "opacity 0.6s ease",
              animation: fade ? "fadeUp 0.7s ease 0.15s both" : "none",
            }}>
              {heroData.length > 0 ? heroData[heroIdx].title : "สำรวจตลาดน้ำ กรุงเทพฯ"}
            </h1>

            {/* Description */}
            <p className="hero-desc" style={{
              fontSize: 15, lineHeight: 1.75,
              margin: "0 0 36px",
              animation: fade ? "fadeUp 0.7s ease 0.25s both" : "none",
            }}>
              {heroData.length > 0 ? heroData[heroIdx].desc : "ช้อปปิ้งวิถีไทย กินอาหารอร่อย อุดหนุนสินค้าชุมชนริมคลองแท้ๆ"}
            </p>

            {/* CTA buttons */}
            <div style={{
              display: "flex", gap: 14, flexWrap: "wrap",
              animation: fade ? "fadeUp 0.7s ease 0.35s both" : "none",
            }}>
              <button
                onClick={() => heroData[heroIdx]?.id && navigate(`/market-review/${heroData[heroIdx].id}`)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "#fff", color: "#0f172a",
                  border: "none", borderRadius: 999, padding: "14px 28px",
                  fontSize: 15, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"; }}
              >
                สำรวจตลาดน้ำ <MdArrowOutward size={18} />
              </button>
              <button
                onClick={() => document.getElementById("shop-sec")?.scrollIntoView({ behavior: "smooth" })}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(255,255,255,0.1)", color: "#fff",
                  border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: 999,
                  padding: "14px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer",
                  backdropFilter: "blur(10px)",
                  transition: "background 0.2s, border-color 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; }}
              >
                ช้อปสินค้าออนไลน์
              </button>
            </div>
            </div>
          </div>
        </div>

        {/* Dots — bottom right */}
        {heroData.length > 1 && (
          <div style={{ position: "absolute", bottom: 36, right: 56, zIndex: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            {heroData.map((_, i) => (
              <button key={i}
                onClick={() => { setFade(false); setTimeout(() => { setHeroIdx(i); setFade(true); }, 250); }}
                style={{
                  width: i === heroIdx ? 3 : 3,
                  height: i === heroIdx ? 28 : 10,
                  borderRadius: 99,
                  background: i === heroIdx ? "#fff" : "rgba(255,255,255,0.3)",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "all 0.35s ease",
                }}
              />
            ))}
          </div>
        )}

        {/* Slide counter — bottom left corner */}
        {heroData.length > 1 && (
          <div style={{ position: "absolute", bottom: 36, left: 56, zIndex: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {String(heroIdx + 1).padStart(2, "0")}
            </span>
            <div style={{ width: 48, height: 1.5, background: "rgba(255,255,255,0.25)", position: "relative", borderRadius: 99 }}>
              <div style={{
                position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 99,
                background: "#fff", transition: "width 0.4s ease",
                width: `${((heroIdx + 1) / heroData.length) * 100}%`,
              }} />
            </div>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              {String(heroData.length).padStart(2, "0")}
            </span>
          </div>
        )}

        {/* Side arrows — tall strip style */}
        {heroData.length > 1 && (
          <>
            <button onClick={() => slide("prev")} style={{
              position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", zIndex: 20,
              width: 56, height: 120, borderRadius: "0 12px 12px 0",
              background: "rgba(255,255,255,0.08)",
              border: "none", borderRight: "1px solid rgba(255,255,255,0.12)",
              color: "#fff", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
              backdropFilter: "blur(12px)", transition: "background 0.2s, width 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; e.currentTarget.style.width = "68px"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.width = "56px"; }}
            >
              <FaChevronLeft style={{ fontSize: 14 }} />
            </button>
            <button onClick={() => slide("next")} style={{
              position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", zIndex: 20,
              width: 56, height: 120, borderRadius: "12px 0 0 12px",
              background: "rgba(255,255,255,0.08)",
              border: "none", borderLeft: "1px solid rgba(255,255,255,0.12)",
              color: "#fff", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
              backdropFilter: "blur(12px)", transition: "background 0.2s, width 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; e.currentTarget.style.width = "68px"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.width = "56px"; }}
            >
              <FaChevronRight style={{ fontSize: 14 }} />
            </button>
          </>
        )}
      </section>


      {/* ╔══════════════════════════════════════════════════════╗ */}
      {/* ║               PRODUCTS / SHOP SECTION               ║ */}
      {/* ╚══════════════════════════════════════════════════════╝ */}
      <section id="shop-sec" style={{ background: "#f1f5f9", padding: "64px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>

          {/* Header row */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
            <div>
              <p style={{ color: "#4b8ff4", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>สินค้าชุมชน</p>
              <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, color: "#0f172a", margin: 0 }}>ช้อปสินค้าจากตลาดน้ำ</h2>
              <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>สั่งซื้ออาหารและสินค้า OTOP ส่งตรงถึงบ้านคุณ</p>
            </div>
            {/* Product search */}
            <div style={{ position: "relative", width: 240 }}>
              <FaMagnifyingGlass style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 12 }} />
              <input
                type="text" placeholder="ค้นหาสินค้า..." value={prodSrch}
                onChange={e => setProdSrchReset(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px 9px 34px",
                  border: "1.5px solid #e2e8f0", borderRadius: 999, fontSize: 13,
                  background: "#fff", outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "#4b8ff4"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>
          </div>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 8, marginBottom: 28, overflowX: "auto", paddingBottom: 4 }}>
            {filterOpts.map(f => (
              <button key={f} onClick={() => setFilterReset(f)} style={{
                whiteSpace: "nowrap", padding: "7px 18px", borderRadius: 999, border: "none",
                fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                background: filter === f ? "linear-gradient(135deg,#4b8ff4,#4b8ff4)" : "#fff",
                color: filter === f ? "#fff" : "#475569",
                boxShadow: filter === f ? "0 4px 12px rgba(75,143,244,0.3)" : "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                {f}
              </button>
            ))}
          </div>

          {/* Product grid */}
          {loadingProducts ? (
            <CardSkeleton count={9} height={180} cols="repeat(auto-fill, minmax(220px, 1fr))" />
          ) : !allVisProd.length ? (
            <EmptyState text="ไม่พบสินค้า" />
          ) : (
            <>
              <div className="rsp-grid-auto" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
                {visProd.map(p => (
                  <ProductCard key={p.product_id} product={p}
                    onView={() => navigate(`/product/${p.product_id}`)}
                    onAdd={() => addToCart(p)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 40 }}>
                  <button className="pg-btn" onClick={() => setProdPage(p => Math.max(1, p - 1))} disabled={prodPage === 1}
                    style={{ width: 40, height: 40, borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", cursor: prodPage === 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "all 0.15s", fontSize: 18, fontWeight: 400 }}
                    onMouseEnter={e => { if (prodPage !== 1) e.currentTarget.style.borderColor="#4b8ff4"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; }}
                  >‹</button>

                  {(() => {
                    const pages = [];
                    const SHOW = 2;
                    for (let i = 1; i <= totalPages; i++) {
                      if (i === 1 || i === totalPages || (i >= prodPage - SHOW && i <= prodPage + SHOW)) {
                        pages.push(i);
                      } else if (pages[pages.length - 1] !== "...") {
                        pages.push("...");
                      }
                    }
                    return pages.map((p, idx) => p === "..." ? (
                      <span key={`dot-${idx}`} style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 15 }}>…</span>
                    ) : (
                      <button key={p} onClick={() => setProdPage(p)}
                        style={{
                          width: 40, height: 40, borderRadius: 12,
                          border: p === prodPage ? "none" : "1.5px solid #e2e8f0",
                          background: p === prodPage ? "linear-gradient(135deg,#4b8ff4,#4b8ff4)" : "#fff",
                          color: p === prodPage ? "#fff" : "#64748b",
                          fontWeight: p === prodPage ? 700 : 400,
                          cursor: "pointer", fontSize: 14,
                          transition: "all 0.2s",
                          boxShadow: p === prodPage ? "0 4px 14px rgba(75,143,244,0.35)" : "0 1px 4px rgba(0,0,0,0.05)",
                          transform: p === prodPage ? "scale(1.1)" : "scale(1)",
                        }}
                        onMouseEnter={e => { if (p !== prodPage) { e.currentTarget.style.borderColor="#4b8ff4"; e.currentTarget.style.color="#4b8ff4"; }}}
                        onMouseLeave={e => { if (p !== prodPage) { e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.color="#64748b"; }}}
                      >{p}</button>
                    ));
                  })()}

                  <button className="pg-btn" onClick={() => setProdPage(p => Math.min(totalPages, p + 1))} disabled={prodPage === totalPages}
                    style={{ width: 40, height: 40, borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", cursor: prodPage === totalPages ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "all 0.15s", fontSize: 18, fontWeight: 400 }}
                    onMouseEnter={e => { if (prodPage !== totalPages) e.currentTarget.style.borderColor="#4b8ff4"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; }}
                  >›</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════╗ */}
      {/* ║                  GAMIFICATION                       ║ */}
      {/* ╚══════════════════════════════════════════════════════╝ */}
      <section style={{ background: "#fff", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ display: "inline-block", background: "#fff5f0", color: "#8d4d11", border: "1px solid #e8b895", borderRadius: 999, padding: "4px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>
              ลูกเล่นสนุกสนาน
            </span>
            <h2 className="game-title" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 800, margin: "0 0 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><FaGamepad /> เกมและภารกิจ</h2>
            <p style={{ color: "#64748b", fontSize: 15, margin: 0 }}>ได้รับคะแนนและรางวัลโดยการเล่นเกมและทำภารกิจ</p>
          </div>

          {/* Game cards */}
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 40, flexWrap: "wrap" }}>
            {GAMES.map(g => (
              <div key={g.label} style={{ width: 280, flexShrink: 0 }}>
                <GameCard game={g} onClick={() => navigate(g.path)} />
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center" }}>
            <button className="game-btn" onClick={() => navigate("/game")} style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "linear-gradient(135deg,#8d4d11,#8d4d11)",
              border: "none", borderRadius: 999, padding: "14px 36px",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 6px 24px rgba(141,77,17,0.35)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform="scale(1.04)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(141,77,17,0.5)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(141,77,17,0.35)"; }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><FaBullseye /> ดูเกมทั้งหมด</span>
            </button>
          </div>
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════╗ */}
      {/* ║                  CART SIDEBAR                       ║ */}
      {/* ╚══════════════════════════════════════════════════════╝ */}
      {/* Overlay */}
      <div
        onClick={() => setCartOpen(false)}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40,
          transition: "opacity 0.25s", opacity: cartOpen ? 1 : 0, pointerEvents: cartOpen ? "auto" : "none",
        }}
      />
      {/* Panel */}
      <aside style={{
        position: "fixed", inset: "0 0 0 auto", width: "min(100vw, 400px)",
        background: "#fff", zIndex: 50, display: "flex", flexDirection: "column",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        transform: cartOpen ? "translateX(0)" : "translateX(100%)",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff0db", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fas fa-basket-shopping" style={{ color: "#6b3a0d", fontSize: 16 }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#0f172a" }}>ตะกร้าสินค้า</p>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>{cartCount} รายการ</p>
            </div>
          </div>
          <button onClick={() => setCartOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #f1f5f9", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
            <FaXmark />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {cart.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", gap: 12, paddingTop: 60 }}>
              <FaBasketShopping style={{ fontSize: 48, opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>ยังไม่มีสินค้าในตะกร้า</p>
            </div>
          ) : cart.map(item => (
            <CartRow key={item.product_id} item={item} onRemove={() => removeItem(item.product_id)} onInc={() => changeQty(item.product_id, 1)} onDec={() => changeQty(item.product_id, -1)} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 20px 24px", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#475569" }}>ยอดรวมทั้งหมด</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#4b8ff4" }}>฿{cartTotal.toLocaleString()}</span>
          </div>
          <button
            onClick={() => { navigate("/cart"); setCartOpen(false); }}
            disabled={!cart.length}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: cart.length ? "linear-gradient(135deg,#4b8ff4,#4b8ff4)" : "#e2e8f0",
              color: cart.length ? "#fff" : "#94a3b8",
              fontSize: 15, fontWeight: 600, cursor: cart.length ? "pointer" : "default",
              boxShadow: cart.length ? "0 4px 16px rgba(75,143,244,0.3)" : "none",
              transition: "all 0.2s",
            }}
          >
            ดำเนินการสั่งซื้อ
          </button>
          <button onClick={() => setCartOpen(false)} style={{ width: "100%", padding: "10px", border: "none", background: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", marginTop: 8 }}>
            ช้อปต่อ →
          </button>
        </div>
      </aside>

      <FloatingCart />

      <Footer />
    </div>
  );
}

/* ─── MarketCard ─────────────────────────────────────────────────── */
function MarketCard({ market, badge, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 16, overflow: "hidden", cursor: "pointer",
        boxShadow: hov ? "0 12px 32px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.06)",
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        transition: "all 0.25s",
      }}
    >
      <div className="market-img" style={{ position: "relative", background: "#0f172a" }}>
        <img
          src={img(market.image_url, MFALLBACK)} alt={market.name}
          onError={e => { e.target.onerror = null; e.target.src = MFALLBACK; }}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s", transform: hov ? "scale(1.47)" : "scale(1.40)" }}
        />
        <span style={{
          position: "absolute", top: 12, left: 12, background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(4px)", padding: "4px 12px", borderRadius: 999,
          fontSize: 11, fontWeight: 600, color: "#334155",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}>
          {badge}
        </span>
      </div>
      <div style={{ padding: "16px 18px 20px" }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, margin: "0 0 6px", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{market.name}</h3>
        <p className="market-desc" style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {market.description || "ตลาดน้ำบรรยากาศดีริมคลอง"}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
          <FaLocationDot style={{ color: "#4b8ff4", flexShrink: 0 }} />
          <span>{market.location || "กรุงเทพมหานคร"}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── ProductCard ────────────────────────────────────────────────── */
function ProductCard({ product, onView, onAdd }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 20, overflow: "hidden",
        boxShadow: hov ? "0 20px 48px rgba(0,0,0,0.13)" : "0 2px 12px rgba(0,0,0,0.07)",
        transform: hov ? "translateY(-6px)" : "none",
        transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
        border: "1px solid rgba(226,232,240,0.6)",
      }}
    >
      {/* Image — full bleed, clean */}
      <div onClick={onView} className="product-img" style={{ cursor: "pointer", flexShrink: 0, background: "#f1f5f9" }}>
        <img
          src={img(product.image_url, PFALLBACK)} alt={product.name}
          onError={e => { e.target.onerror = null; e.target.src = PFALLBACK; }}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease", transform: hov ? "scale(1.06)" : "scale(1.0)" }}
        />
      </div>

      {/* Info */}
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
        {product.market_name && (
          <span style={{ display: "inline-block", alignSelf: "flex-start", background: "#fff5f0", color: "#6b3a0d", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, marginBottom: 8 }}>
            {product.market_name}
          </span>
        )}
        <p onClick={onView} style={{
          fontWeight: 700, fontSize: 15, color: "#0f172a", margin: "0 0 4px",
          cursor: "pointer", overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 1, WebkitBoxOrient: "vertical", transition: "color 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.color="#6b3a0d"}
          onMouseLeave={e => e.currentTarget.style.color="#0f172a"}
        >
          {product.name || "สินค้า"}
        </p>
        <p style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5, flex: 1, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {product.description || "สินค้าคุณภาพดีจากชุมชน"}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: "#0f172a" }}>
            ฿{Number(product.price ?? 0).toLocaleString()}
          </p>
          <button onClick={onAdd} aria-label="เพิ่มลงตะกร้า" style={{
            width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "50%", border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#8d4d11,#6b3a0d)",
            color: "#fff", transition: "all 0.2s",
            boxShadow: hov ? "0 6px 16px rgba(141,77,17,0.4)" : "0 2px 8px rgba(141,77,17,0.3)",
          }}>
            <FaCartPlus style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── GameCard ───────────────────────────────────────────────────── */
function GameCard({ game, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 16, border: "none", cursor: "pointer", padding: "24px",
        background: `linear-gradient(135deg, ${game.col}, ${game.col}cc)`,
        textAlign: "left", position: "relative", overflow: "hidden",
        transform: hov ? "translateY(-4px)" : "none",
        boxShadow: hov ? `0 12px 28px ${game.col}55` : `0 4px 16px ${game.col}30`,
        transition: "all 0.25s",
      }}
    >
      {/* bg circle */}
      <div style={{ position: "absolute", right: -16, bottom: -16, width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
      <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 14, transition: "transform 0.2s", transform: hov ? "scale(1.15)" : "scale(1)" }}>
        {game.emoji}
      </div>
      <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15, color: "#fff" }}>{game.label}</p>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{game.sub}</p>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>เล่นเลย →</span>
    </button>
  );
}

/* ─── CartRow ────────────────────────────────────────────────────── */
function CartRow({ item, onRemove, onInc, onDec }) {
  return (
    <div style={{ display: "flex", gap: 12, background: "#f8fafc", borderRadius: 12, padding: "10px 12px", border: "1px solid #f1f5f9" }}>
      <img
        src={img(item.image_url, PFALLBACK)} alt={item.name}
        onError={e => { e.target.onerror = null; e.target.src = PFALLBACK; }}
        style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: "#0f172a", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 8px" }}>฿{Number(item.price ?? 0).toLocaleString()} / ชิ้น</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onDec} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 16, textAlign: "center", color: "#0f172a" }}>{item.qty}</span>
          <button onClick={onInc} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #b8d4fb", background: "#edf3ff", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#4b8ff4", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>฿{(Number(item.price ?? 0) * item.qty).toLocaleString()}</span>
        <button onClick={onRemove} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #ffe8d4", background: "#fff0e8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#b87040" }}>
          <FaTrashCan style={{ fontSize: 11 }} />
        </button>
      </div>
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────── */
function CardSkeleton({ count, height, cols = "repeat(auto-fill, minmax(280px, 1fr))" }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ height, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ height: 16, borderRadius: 6, background: "#f1f5f9", width: "70%" }} />
            <div style={{ height: 12, borderRadius: 6, background: "#f8fafc", width: "90%" }} />
            <div style={{ height: 12, borderRadius: 6, background: "#f8fafc", width: "50%" }} />
          </div>
        </div>
      ))}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

/* ─── Empty ──────────────────────────────────────────────────────── */
function EmptyState({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8" }}>
      <p style={{ fontSize: 40, margin: "0 0 12px", display: "flex", justifyContent: "center" }}><FaWater /></p>
      <p style={{ fontWeight: 500 }}>{text}</p>
    </div>
  );
}
