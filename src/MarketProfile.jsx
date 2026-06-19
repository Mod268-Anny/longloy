import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaBasketShopping, FaStar, FaChevronLeft } from 'react-icons/fa6';
import Footer from './Footer';
import FloatingCart from './FloatingCart';
import { FaUserCircle } from 'react-icons/fa';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';
import API_URL, { secureLocalFetch, resolveImg } from './config';
import useCartCount from './useCartCount';

const NAV = [
  { label: "หน้าแรก",   icon: <MdHome size={18}/>,                path: "/homepage" },
  { label: "ตลาดน้ำ",   icon: <MdStorefront size={18}/>,           path: "/market"   },
  { label: "เกม",       icon: <MdOutlineSportsEsports size={18}/>, path: "/game"     },
  { label: "ช่วยเหลือ", icon: <MdHelpOutline size={18}/>,          path: "/help"     },
];

const MFALLBACK = 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=600&q=80';
const imgSrc = (url) => resolveImg(url, MFALLBACK);

export default function MarketProfile() {
  const { market_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const cartCount = useCartCount();

  const [market,    setMarket]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [reviews,   setReviews]   = useState([]);
  const [newReview, setNewReview] = useState({ reviewer_name: '', comment: '', rating: 0 });
  const [submitting,setSubmitting]= useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [hoverStar, setHoverStar] = useState(0);

  useEffect(() => {
    if (!market_id) return;
    setLoading(true);
    secureLocalFetch(`${API_URL}/floating-markets/all`)
      .then(r => r.json())
      .then(data => {
        setMarket(Array.isArray(data) ? data.find(m => String(m.market_id) === String(market_id)) : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    secureLocalFetch(`${API_URL}/market-reviews/${market_id}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setReviews(Array.isArray(d) ? d : []))
      .catch(() => setReviews([]));
  }, [market_id]);

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!newReview.reviewer_name || !newReview.comment || !newReview.rating) { setError('กรุณากรอกชื่อ รีวิว และให้คะแนน'); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('กรุณาล็อกอินก่อน'); setSubmitting(false); return; }
      const res = await secureLocalFetch(`${API_URL}/market-reviews/${market_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newReview),
      });
      const ct = res.headers.get('content-type');
      const data = ct?.includes('application/json') ? await res.json() : {};
      if (res.ok && data.success) {
        setReviews(p => [...p, { ...newReview, created_at: new Date().toISOString() }]);
        setNewReview({ reviewer_name: '', comment: '', rating: 0 });
        setSuccess('ขอบคุณสำหรับรีวิว!');
        setTimeout(() => setSuccess(''), 3000);
      } else { setError(data.error || 'บันทึกรีวิวไม่สำเร็จ'); }
    } catch (err) { setError('เกิดข้อผิดพลาด'); }
    setSubmitting(false);
  };

  /* Navbar */
  const Navbar = () => (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
      <div className="rsp-header-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <button onClick={() => navigate("/homepage")} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}>
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

  if (loading) return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f0f4f8", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ maxWidth: 760, margin: "48px auto", padding: "0 24px" }}>
        <div style={{ height: 320, borderRadius: 20, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    </div>
  );

  if (!market) return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f0f4f8", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8" }}><p style={{ fontSize: 40 }}>🌊</p><p style={{ fontWeight: 600 }}>ไม่พบข้อมูลตลาดน้ำ</p></div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f0f4f8", minHeight: "100vh", color: "#0f172a" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .mp-input:focus { outline: none; border-color: #4b8ff4 !important; box-shadow: 0 0 0 3px rgba(75,143,244,0.15) !important; }
        .mp-textarea:focus { outline: none; border-color: #4b8ff4 !important; box-shadow: 0 0 0 3px rgba(75,143,244,0.15) !important; }
        .mp-market-title { color: #ffffff !important; }
      `}</style>

      <Navbar />

      {/* Back button — ชิดซ้าย */}
      <div style={{ padding: "20px 32px 0", textAlign: "left", display: "flex", justifyContent: "flex-start" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 999, padding: "7px 16px", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="#4b8ff4"; e.currentTarget.style.color="#4b8ff4"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.color="#475569"; }}
        >
          <FaChevronLeft style={{ fontSize: 10 }} />
          กลับ
        </button>
      </div>

      <main className="rsp-main" style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 80px" }}>

        {/* Market header card */}
        <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", border: "1px solid rgba(226,232,240,0.7)", marginBottom: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>

          {/* Hero image — 320px tall */}
          <div style={{ height: 320, overflow: "hidden", position: "relative" }}>
            <img
              src={imgSrc(market.image_url)}
              alt={market.name}
              onError={e => { e.target.onerror=null; e.target.src='https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=600&q=80'; }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Stronger gradient overlay — bottom 60% */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,12,24,0.88) 0%, rgba(8,12,24,0.55) 30%, rgba(8,12,24,0.1) 60%, transparent 100%)", pointerEvents: "none" }} />

            {/* Market name + rating on image */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 28px 24px" }}>
              <h1 className="mp-market-title" style={{ fontWeight: 800, fontSize: "2rem", margin: "0 0 8px", textShadow: "0 2px 12px rgba(0,0,0,0.5)", lineHeight: 1.2 }}>{market.name}</h1>
              {market.location && (
                <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
                  📍 {market.location}
                </p>
              )}
              {/* Stars on image overlay */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {[1,2,3,4,5].map(i => (
                    <FaStar key={i} style={{ fontSize: 15, color: i <= Math.round(avgRating) ? "#8d4d11" : "rgba(255,255,255,0.25)" }} />
                  ))}
                </div>
                <span style={{ fontWeight: 700, color: "#8d4d11", fontSize: 15 }}>
                  {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                </span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                  ({reviews.length} รีวิว)
                </span>
              </div>
            </div>
          </div>

          {/* Below image section */}
          <div style={{ padding: "22px 28px 24px" }}>
            {market.description && (
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.85, margin: "0 0 20px" }}>{market.description}</p>
            )}

            {/* Stats row + shop button */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {/* Rating score stat */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffbeb", border: "1px solid #e8b895", borderRadius: 12, padding: "10px 16px" }}>
                <FaStar style={{ color: "#8d4d11", fontSize: 18 }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#5c2c08" }}>{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#5c2c08", fontWeight: 500 }}>คะแนนเฉลี่ย</p>
                </div>
              </div>
              {/* Review count stat */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f0f4ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "10px 16px" }}>
                <span style={{ fontSize: 20 }}>💬</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#075985" }}>{reviews.length}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#1a3a6e", fontWeight: 500 }}>รีวิวทั้งหมด</p>
                </div>
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Shop button */}
              <button
                onClick={() => market_id && navigate(`/shops/${market_id}`)}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #8d4d11 0%, #8d4d11 100%)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(141,77,17,0.3)", transition: "opacity 0.15s, transform 0.15s", letterSpacing: "0.02em" }}
                onMouseEnter={e => { e.currentTarget.style.opacity="0.9"; e.currentTarget.style.transform="translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="none"; }}
              >
                <FaBasketShopping style={{ fontSize: 15 }} />
                ดูร้านค้า
              </button>
            </div>
          </div>
        </div>

        {/* Review form */}
        <ReviewForm
          title="รีวิวตลาดน้ำ"
          value={newReview} onChange={setNewReview}
          hoverStar={hoverStar} setHoverStar={setHoverStar}
          onSubmit={handleSubmit} submitting={submitting}
          error={error} success={success}
        />

        {/* Review list */}
        <ReviewList reviews={reviews} />
      </main>

      <FloatingCart />

      <Footer />
    </div>
  );
}

/* ─── Shared sub-components ──────────────────────────────────────── */
function ReviewForm({ title, value, onChange, hoverStar, setHoverStar, onSubmit, submitting, error, success }) {
  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", borderLeft: "4px solid #4b8ff4", padding: "22px 24px", marginBottom: 20, boxShadow: "0 2px 12px rgba(75,143,244,0.07)" }}>
      <h2 style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#4b8ff4,#4b8ff4)", color: "#fff", fontSize: 13 }}>✏️</span>
        {title}
      </h2>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          className="mp-input"
          type="text"
          placeholder="ชื่อของคุณ"
          value={value.reviewer_name}
          onChange={e => onChange(v => ({ ...v, reviewer_name: e.target.value }))}
          style={{ padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, background: "#fafcff", transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: "inherit" }}
          disabled={submitting}
        />
        <textarea
          className="mp-textarea"
          placeholder="เขียนรีวิว..."
          value={value.comment}
          onChange={e => onChange(v => ({ ...v, comment: e.target.value }))}
          style={{ padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, minHeight: 90, background: "#fafcff", resize: "vertical", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s" }}
          disabled={submitting}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>ให้คะแนน:</span>
          {[1,2,3,4,5].map(i => (
            <span key={i} role="button"
              onClick={() => onChange(v => ({ ...v, rating: i }))}
              onMouseEnter={() => setHoverStar(i)} onMouseLeave={() => setHoverStar(0)}
              style={{ cursor: "pointer", fontSize: 24, color: i <= (hoverStar || value.rating) ? "#8d4d11" : "#e2e8f0", transition: "color 0.15s", lineHeight: 1 }}
            >★</span>
          ))}
          {value.rating > 0 && <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 4 }}>{value.rating} ดาว</span>}
        </div>
        {error   && <p style={{ color: "#8d4d11", fontSize: 13, margin: 0, padding: "9px 14px", background: "#fff0e8", borderRadius: 10, borderLeft: "3px solid #8d4d11" }}>{error}</p>}
        {success && <p style={{ color: "#166534", fontSize: 13, margin: 0, padding: "9px 14px", background: "#f0fdf4", borderRadius: 10, borderLeft: "3px solid #22c55e" }}>{success}</p>}
        <button
          type="submit"
          disabled={submitting}
          style={{ padding: "12px 0", borderRadius: 11, border: "none", background: submitting ? "#e2e8f0" : "linear-gradient(135deg,#4b8ff4,#4b8ff4)", color: submitting ? "#94a3b8" : "#fff", fontSize: 14, fontWeight: 700, cursor: submitting ? "default" : "pointer", boxShadow: submitting ? "none" : "0 4px 16px rgba(75,143,244,0.28)", transition: "opacity 0.15s" }}
        >
          {submitting ? "⏳ กำลังส่ง..." : "ส่งรีวิว"}
        </button>
      </form>
    </div>
  );
}

function ReviewList({ reviews }) {
  if (!reviews.length) return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", padding: "48px 24px", textAlign: "center", color: "#94a3b8", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
      <p style={{ fontSize: 36, margin: "0 0 10px" }}>⭐</p>
      <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>ยังไม่มีรีวิว</p>
      <p style={{ fontSize: 13, marginTop: 4 }}>เป็นคนแรกที่รีวิวตลาดแห่งนี้!</p>
    </div>
  );

  /* Map rating to an accent color */
  const ratingColor = (r) => {
    if (r >= 4) return { bg: "linear-gradient(160deg,#2d6fd4,#4b8ff4)", bar: "#2d6fd4" };
    if (r >= 3) return { bg: "linear-gradient(160deg,#4b8ff4,#4b8ff4)", bar: "#4b8ff4" };
    if (r >= 2) return { bg: "linear-gradient(160deg,#8d4d11,#8d4d11)", bar: "#8d4d11" };
    return { bg: "linear-gradient(160deg,#8d4d11,#8d4d11)", bar: "#8d4d11" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {reviews.map((r, i) => {
        const colors = ratingColor(r.rating || 0);
        return (
          <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", borderLeft: `4px solid ${colors.bar}`, padding: "16px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", gap: 0, flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                {/* Avatar with rating-matched gradient */}
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
                  {(r.reviewer_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{r.reviewer_name || "ผู้ใช้ทั่วไป"}</p>
                  <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                    {[1,2,3,4,5].map(s => <FaStar key={s} style={{ fontSize: 11, color: s <= (r.rating||0) ? "#8d4d11" : "#e2e8f0" }} />)}
                  </div>
                </div>
              </div>
              {r.created_at && (
                <span style={{ fontSize: 12, color: "#94a3b8", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "3px 10px" }}>
                  {new Date(r.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.8, margin: 0 }}>{r.comment}</p>
          </div>
        );
      })}
    </div>
  );
}
