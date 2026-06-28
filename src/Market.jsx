// ============================================================
// Market.jsx — หน้าแสดงตลาดน้ำทั้งหมด
//
// หน้าที่: แสดงการ์ดตลาดน้ำทุกแห่ง + ค้นหา + กดเข้าดูรายละเอียด
//
// ส่วนที่มี:
//   - ค้นหาตลาด (GET /floating-markets/search?q=)
//   - การ์ดตลาด: รูป, ชื่อ, ที่ตั้ง, rating เฉลี่ย
//   - กดการ์ด → navigate("/market-review/:market_id")
// ============================================================
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaLocationDot, FaStar, FaChevronDown, FaCalendarDays,
} from 'react-icons/fa6';
import Footer from './Footer';
import FloatingCart from './FloatingCart';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';
import API_URL, { secureLocalFetch, resolveImg } from './config';
import useCartCount from './useCartCount';

const NAV = [
  { label: "หน้าแรก",  icon: <MdHome size={18}/>,                path: "/homepage" },
  { label: "ตลาดน้ำ",  icon: <MdStorefront size={18}/>,           path: "/market"   },
  { label: "เกม",      icon: <MdOutlineSportsEsports size={18}/>, path: "/game"     },
  { label: "ช่วยเหลือ",icon: <MdHelpOutline size={18}/>,          path: "/help"     },
];

const MFALLBACK = 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=600&q=80';
const imgSrc = (url) => resolveImg(url, MFALLBACK);

/* ─── Star rating display ─────────────────────────────────────── */
function Stars({ rating, size = 14 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <FaStar key={i} style={{ fontSize: size, color: i <= Math.round(rating) ? '#8d4d11' : '#e2e8f0' }} />
      ))}
    </div>
  );
}

export default function Market() {
  const navigate = useNavigate();
  const location = useLocation();
  const cartCount = useCartCount();

  const [markets,        setMarkets]        = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [marketRatings,  setMarketRatings]  = useState({});
  const [loading,        setLoading]        = useState(true);

  const [sortBy,         setSortBy]         = useState('default');
  const [minRating,      setMinRating]      = useState(0);
  const [showFilters,    setShowFilters]    = useState(false);

  /* fetch markets + ratings */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    secureLocalFetch(`${API_URL}/floating-markets/all`)
      .then(r => r.json())
      .then(async data => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        setMarkets(arr);
        const ratingsObj = {};
        await Promise.all(arr.map(async m => {
          if (!m.market_id) return;
          try {
            const r = await secureLocalFetch(`${API_URL}/market-reviews/${m.market_id}`);
            const reviews = r.ok ? await r.json() : [];
            const valid = Array.isArray(reviews) ? reviews.map(rv => Number(rv.rating) || 0).filter(v => v > 0) : [];
            ratingsObj[m.market_id] = {
              avg:   valid.length ? Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)) : 0,
              count: valid.length,
            };
          } catch { ratingsObj[m.market_id] = { avg: 0, count: 0 }; }
        }));
        if (!cancelled) setMarketRatings(ratingsObj);
      })
      .catch(() => { if (!cancelled) setMarkets([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* apply filters */
  useEffect(() => {
    let r = markets.filter(m => {
if ((marketRatings[m.market_id]?.avg || 0) < minRating) return false;
      return true;
    });
    if (sortBy === 'rating_high') r.sort((a, b) => (marketRatings[b.market_id]?.avg || 0) - (marketRatings[a.market_id]?.avg || 0));
    if (sortBy === 'rating_low')  r.sort((a, b) => (marketRatings[a.market_id]?.avg || 0) - (marketRatings[b.market_id]?.avg || 0));
    if (sortBy === 'name_az')     r.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setFiltered(r);
  }, [sortBy, minRating, marketRatings, markets]);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f0f4f8", minHeight: "100vh" }}>

      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes heroFadeIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes waveMove { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .hero-search-input::placeholder { color: rgba(100,116,139,0.7); }
        .hero-search-input:focus { outline: none; box-shadow: 0 0 0 3px rgba(75,143,244,0.18); }
        .controls-select:focus { outline: none; box-shadow: 0 0 0 3px rgba(75,143,244,0.12); }
        .market-hero-title { color: #ffffff !important; }
      `}</style>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
        <div className="rsp-header-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <button onClick={() => navigate("/homepage")} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
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

      {/* ── Hero banner ─────────────────────────────────────────── */}
      <section style={{ background: "#4b8ff4", position: "relative", overflow: "hidden", padding: "56px 0 48px" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1, width: "100%", animation: "heroFadeIn 0.6s ease both" }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
            ค้นหาตลาดน้ำ · กรุงเทพมหานคร
          </p>
          <h1 className="market-hero-title" style={{ fontSize: "3rem", fontWeight: 800, margin: "0 0 10px", lineHeight: 1.15, letterSpacing: "-0.01em", color: "#fff" }}>
            ตลาดน้ำ กรุงเทพฯ
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, margin: 0, fontWeight: 400 }}>
            สัมผัสความงามของตลาดน้ำ เลือกเยี่ยมชมตลาดที่ชื่นชอบ
          </p>
        </div>
      </section>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="rsp-main" style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Controls row */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8edf3", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            แสดง <strong style={{ color: "#0f172a", fontWeight: 700 }}>{filtered.length}</strong> ตลาดน้ำ
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            {/* Sort */}
            <div style={{ position: "relative" }}>
              <select
                className="controls-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{ appearance: "none", padding: "9px 38px 9px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer", outline: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "border-color 0.15s, box-shadow 0.15s" }}
              >
                <option value="default">เรียงตามค่าเริ่มต้น</option>
                <option value="rating_high">คะแนนสูง → ต่ำ</option>
                <option value="rating_low">คะแนนต่ำ → สูง</option>
                <option value="name_az">ชื่อ A-Z</option>
              </select>
              <FaChevronDown style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#94a3b8", pointerEvents: "none" }} />
            </div>
            {/* Min rating */}
            <div style={{ position: "relative" }}>
              <select
                className="controls-select"
                value={minRating}
                onChange={e => setMinRating(Number(e.target.value))}
                style={{ appearance: "none", padding: "9px 38px 9px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer", outline: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "border-color 0.15s, box-shadow 0.15s" }}
              >
                <option value={0}>ทุกระดับคะแนน</option>
                {[1,2,3,4].map(n => <option key={n} value={n}>★ {n}+ ขึ้นไป</option>)}
              </select>
              <FaChevronDown style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#94a3b8", pointerEvents: "none" }} />
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="mkt-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 22 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                <div style={{ height: 240, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ height: 16, borderRadius: 6, background: "#f1f5f9", width: "60%" }} />
                  <div style={{ height: 12, borderRadius: 6, background: "#f8fafc" }} />
                  <div style={{ height: 12, borderRadius: 6, background: "#f8fafc", width: "80%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🌊</p>
            <p style={{ fontWeight: 600, fontSize: 16 }}>ไม่พบตลาดน้ำที่ตรงกับเงื่อนไข</p>
            <button onClick={() => { setSearchTerm(''); setMinRating(0); setSortBy('default'); }}
              style={{ marginTop: 16, padding: "9px 24px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#475569" }}
            >ล้างตัวกรอง</button>
          </div>
        ) : (
          <div className="mkt-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 22 }}>
            {filtered.map(m => (
              <MarketCard key={m.market_id} market={m} ratingObj={marketRatings[m.market_id] || { avg: 0, count: 0 }}
                onReview={() => navigate(`/market-review/${m.market_id}`)}
                onShops={() => m.market_id && navigate(`/shops/${m.market_id}`)}
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

/* ─── Market Card ────────────────────────────────────────────────── */
function MarketCard({ market, ratingObj = { avg: 0, count: 0 }, onReview, onShops }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onReview}
      style={{
        background: "#fff",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: hov ? "0 20px 48px rgba(0,0,0,0.14)" : "0 3px 12px rgba(0,0,0,0.07)",
        transform: hov ? "translateY(-6px)" : "none",
        transition: "all 0.28s cubic-bezier(0.34,1.2,0.64,1)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        border: "1px solid rgba(226,232,240,0.6)",
      }}
    >
      {/* Image */}
      <div className="market-img" style={{ flexShrink: 0, background: "#0f172a" }}>
        <img
          src={imgSrc(market.image_url)}
          alt={market.name}
          onError={e => { e.target.onerror=null; e.target.src='https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=600&q=80'; }}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease", transform: hov ? "scale(1.47)" : "scale(1.40)" }}
        />

        {/* Cinematic dark gradient overlay — bottom 50% */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,12,24,0.82) 0%, rgba(8,12,24,0.4) 40%, transparent 65%)", pointerEvents: "none" }} />

        {/* Single status badge top-left */}
        {(market.open_days || market.open_hours) && (
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 5, background: "rgba(21,128,61,0.88)", backdropFilter: "blur(8px)", borderRadius: 999, padding: "4px 11px", fontSize: 11, fontWeight: 700, color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.18)", maxWidth: "calc(100% - 24px)", overflow: "hidden" }}>
            <FaCalendarDays style={{ fontSize: 10, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {market.open_days}{market.open_days && market.open_hours ? " · " : ""}{market.open_hours}
            </span>
          </div>
        )}

        {/* Single rating badge top-right */}
        {ratingObj.avg > 0 && (
          <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(141,77,17,0.92)", backdropFilter: "blur(6px)", borderRadius: 999, padding: "4px 11px", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
            <FaStar style={{ color: "#fff", fontSize: 11 }} />
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>{ratingObj.avg.toFixed(1)}</span>
          </div>
        )}

      </div>

      {/* Body below image */}
      <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", margin: "0 0 5px", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{market.name}</h3>
        {market.location && (
          <div className="market-loc" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#94a3b8", marginBottom: 8, overflow: "hidden" }}>
            <FaLocationDot style={{ color: "#4b8ff4", flexShrink: 0, fontSize: 11 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{market.location}</span>
          </div>
        )}
        {/* Rating row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Stars rating={ratingObj.avg} />
          {ratingObj.avg > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#8d4d11" }}>{ratingObj.avg.toFixed(1)}</span>
          )}
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            {ratingObj.count > 0 ? `(${ratingObj.count})` : "ยังไม่มีรีวิว"}
          </span>
          {market.shop_count > 0 && (
            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto", whiteSpace: "nowrap" }}>🏪 {market.shop_count} ร้าน</span>
          )}
        </div>

        <p className="market-desc" style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65, flex: 1, margin: "0 0 14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {market.description || "ตลาดน้ำบรรยากาศดีริมคลอง"}
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); onReview(); }}
            style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1.5px solid #8d4d11", background: "#fff", color: "#8d4d11", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.background="#8d4d11"; e.currentTarget.style.color="#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.color="#8d4d11"; }}
          >
            โปรไฟล์
          </button>
          <button
            onClick={e => { e.stopPropagation(); onShops(); }}
            style={{ flex: 2, padding: "10px 0", borderRadius: 12, border: "none", background: "#4b8ff4", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 10px rgba(75,143,244,0.28)", transition: "all 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.background="#2d6fd4"; e.currentTarget.style.boxShadow="0 6px 18px rgba(75,143,244,0.42)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="#4b8ff4"; e.currentTarget.style.boxShadow="0 3px 10px rgba(75,143,244,0.28)"; }}
          >
            สำรวจตลาด
          </button>
        </div>
      </div>
    </div>
  );
}
