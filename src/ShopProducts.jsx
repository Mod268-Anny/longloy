import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaPlus, FaPenToSquare, FaTrashCan, FaBoxOpen,
} from 'react-icons/fa6';
import Footer from './Footer';
import FloatingCart from './FloatingCart';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';
import API_URL, { secureLocalFetch } from './config';

const NAV = [
  { label: "หน้าแรก",   icon: <MdHome size={18}/>,                path: "/homepage" },
  { label: "ตลาดน้ำ",   icon: <MdStorefront size={18}/>,           path: "/market"   },
  { label: "เกม",       icon: <MdOutlineSportsEsports size={18}/>, path: "/game"     },
  { label: "ช่วยเหลือ", icon: <MdHelpOutline size={18}/>,          path: "/help"     },
];

const imgSrc = (url) =>
  !url ? null
  : url.startsWith('http') || url.startsWith('/') ? url : `/images/${url}`;

export default function ShopProducts() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [user,         setUser]         = useState(null);
  const [entrepreneur, setEntrepreneur] = useState(null);
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [deleting,     setDeleting]     = useState(null);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  /* ── load data ─────────────────────────────────────────────── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/'); return; }

    secureLocalFetch(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setUser(data.user);
        if (!data.user?.user_id) throw new Error('ไม่พบข้อมูลผู้ใช้');
        return secureLocalFetch(`${API_URL}/entrepreneur/${data.user.user_id}`);
      })
      .then(r => { if (r.ok) return r.json(); throw new Error('ไม่พบข้อมูลผู้ประกอบการ'); })
      .then(data => {
        if (data?.is_verified !== 1) {
          setError('คุณต้องได้รับการอนุมัติจากแอดมินก่อนจึงจะสามารถจัดการสินค้าได้');
          setTimeout(() => navigate('/profile'), 3000);
        }
        setEntrepreneur(data);
        const shop_id = data?.shop_id || data?.entrepreneurs_id;
        return secureLocalFetch(`${API_URL}/products/by-shop/${shop_id}`, { headers: { Authorization: `Bearer ${token}` } });
      })
      .then(r => r.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(err => setError('เกิดข้อผิดพลาดในการโหลดข้อมูล'))
      .finally(() => setLoading(false));
  }, [navigate]);

  /* ── delete ─────────────────────────────────────────────────── */
  const handleDelete = async (product_id) => {
    if (!window.confirm('ต้องการลบสินค้านี้ใช่หรือไม่?')) return;
    setDeleting(product_id); setError(''); setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res   = await secureLocalFetch(`${API_URL}/products/${product_id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();
      if (res.ok) {
        setSuccess('ลบสินค้าสำเร็จแล้ว');
        setProducts(p => p.filter(x => x.product_id !== product_id));
        setTimeout(() => setSuccess(''), 3000);
      } else { setError(data.error || 'ลบสินค้าไม่สำเร็จ'); }
    } catch { setError('เกิดข้อผิดพลาดในการลบสินค้า'); }
    finally   { setDeleting(null); }
  };

  /* ── shared navbar ──────────────────────────────────────────── */
  const Navbar = () => (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
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
          <button onClick={() => navigate("/cart")} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="fas fa-basket-shopping" style={{ fontSize: 17 }} />
          </button>
          <button onClick={() => navigate("/profile")} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="fas fa-user-circle" style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>
    </header>
  );

  /* ── loading ────────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 20 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ height: 180, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ height: 16, borderRadius: 6, background: "#f1f5f9", width: "65%" }} />
                <div style={{ height: 12, borderRadius: 6, background: "#f8fafc" }} />
              </div>
            </div>
          ))}
        </div>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    </div>
  );

  /* ── error (no entrepreneur data) ──────────────────────────── */
  if (error && !entrepreneur) return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "48px 40px", textAlign: "center", maxWidth: 440, border: "1px solid #ffe8d4", boxShadow: "0 4px 20px rgba(141,77,17,0.08)" }}>
          <p style={{ fontSize: 48, margin: "0 0 16px" }}>⚠️</p>
          <h2 style={{ fontWeight: 700, fontSize: 18, color: "#0f172a", margin: "0 0 10px" }}>ไม่สามารถเข้าถึงได้</h2>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px", lineHeight: 1.7 }}>{error}</p>
          <button onClick={() => navigate('/profile')} style={{ padding: "11px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4b8ff4,#4b8ff4)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            กลับหน้า Profile
          </button>
        </div>
      </div>
    </div>
  );

  /* ── main ───────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#0f172a" }}>
      <Navbar />

      <main className="rsp-main" style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          ← ย้อนกลับ
        </button>

        {/* Page header */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", padding: "24px 28px", marginBottom: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ color: "#4b8ff4", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px" }}>จัดการร้านค้า</p>
            <h1 style={{ fontWeight: 800, fontSize: "clamp(1.2rem,2.5vw,1.6rem)", color: "#0f172a", margin: "0 0 4px" }}>📦 จัดการสินค้า</h1>
            {entrepreneur?.shop_name && (
              <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
                ร้าน <strong style={{ color: "#0f172a" }}>{entrepreneur.shop_name}</strong>
                <span style={{ marginLeft: 10, fontSize: 12, background: "#edf3ff", color: "#1a3a6e", border: "1px solid #b8d4fb", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>
                  {products.length} สินค้า
                </span>
              </p>
            )}
          </div>
          <button
            onClick={() => navigate('/add-product')}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#4b8ff4,#4b8ff4)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(75,143,244,0.3)", transition: "opacity 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <FaPlus style={{ fontSize: 13 }} /> เพิ่มสินค้า
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ background: "#fff0e8", border: "1px solid #ffe8d4", borderRadius: 12, padding: "13px 18px", marginBottom: 20, color: "#4a2008", fontSize: 14, fontWeight: 500 }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{ background: "#edf3ff", border: "1px solid #b8d4fb", borderRadius: 12, padding: "13px 18px", marginBottom: 20, color: "#1a3a6e", fontSize: 14, fontWeight: 500 }}>
            ✓ {success}
          </div>
        )}

        {/* Product grid */}
        {products.length === 0 ? (
          /* Empty state */
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", padding: "72px 40px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>
              <FaBoxOpen style={{ color: "#94a3b8", fontSize: 32 }} />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 18, color: "#0f172a", margin: "0 0 8px" }}>ยังไม่มีสินค้า</h3>
            <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 28px" }}>เริ่มต้นด้วยการเพิ่มสินค้าแรกของคุณ</p>
            <button
              onClick={() => navigate('/add-product')}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#4b8ff4,#4b8ff4)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(75,143,244,0.3)" }}
            >
              <FaPlus style={{ fontSize: 12 }} /> เพิ่มสินค้าแรก
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 20 }}>
            {products.map(product => (
              <ProductCard
                key={product.product_id}
                product={product}
                deleting={deleting === product.product_id}
                onEdit={() => navigate(`/edit-product/${product.product_id}`)}
                onDelete={() => handleDelete(product.product_id)}
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

/* ─── Product Card ───────────────────────────────────────────────── */
function ProductCard({ product, deleting, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);
  const src = !product.image_url ? null
    : product.image_url.startsWith('http') || product.image_url.startsWith('/') ? product.image_url
    : `/images/${product.image_url}`;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 20, overflow: "hidden",
        boxShadow: hov ? "0 20px 48px rgba(0,0,0,0.13)" : "0 2px 12px rgba(0,0,0,0.07)",
        transform: hov ? "translateY(-6px)" : "none",
        transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column",
        border: "1px solid rgba(226,232,240,0.6)",
      }}
    >
      {/* Image */}
      <div className="product-img" style={{ background: "#f8fafc", overflow: "hidden", position: "relative", flexShrink: 0 }}>
        {src ? (
          <img src={src} alt={product.name}
            onError={e => { e.target.onerror = null; e.target.style.display = "none"; }}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease", transform: hov ? "scale(1.06)" : "scale(1.0)" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#cbd5e1", gap: 8 }}>
            <FaBoxOpen style={{ fontSize: 36 }} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>ไม่มีรูปภาพ</span>
          </div>
        )}

        {/* Available badge */}
        <div style={{
          position: "absolute", top: 10, left: 10,
          background: product.is_available ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.85)",
          color: "#fff", fontSize: 11, fontWeight: 700,
          padding: "3px 10px", borderRadius: 6, backdropFilter: "blur(4px)",
        }}>
          {product.is_available ? "✓ พร้อมขาย" : "✕ ไม่พร้อม"}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 18px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {product.name}
        </h3>

        {product.category && (
          <span style={{ fontSize: 11, color: "#4b8ff4", background: "#edf3ff", padding: "2px 8px", borderRadius: 5, fontWeight: 600, marginBottom: 8, display: "inline-block", width: "fit-content" }}>
            {product.category}
          </span>
        )}

        <div style={{ fontSize: 22, fontWeight: 900, color: "#4b8ff4", margin: "6px 0 14px", lineHeight: 1 }}>
          ฿{parseFloat(product.price || 0).toLocaleString()}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#f1f5f9", marginBottom: 14 }} />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
          <button
            onClick={onEdit}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#4b8ff4"; e.currentTarget.style.color = "#4b8ff4"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
          >
            <FaPenToSquare style={{ fontSize: 12 }} /> แก้ไข
          </button>

          <button
            onClick={onDelete}
            disabled={deleting}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, border: "none", background: deleting ? "#f1f5f9" : "#fff0e8", color: deleting ? "#94a3b8" : "#8d4d11", fontSize: 13, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", border: `1px solid ${deleting ? "#e2e8f0" : "#ffe8d4"}`, transition: "all 0.15s" }}
            onMouseEnter={e => { if (!deleting) { e.currentTarget.style.background = "#fff0e8"; e.currentTarget.style.borderColor = "#8d4d11"; } }}
            onMouseLeave={e => { if (!deleting) { e.currentTarget.style.background = "#fff0e8"; e.currentTarget.style.borderColor = "#ffe8d4"; } }}
          >
            {deleting ? (
              <>⏳ กำลังลบ...</>
            ) : (
              <><FaTrashCan style={{ fontSize: 12 }} /> ลบ</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
