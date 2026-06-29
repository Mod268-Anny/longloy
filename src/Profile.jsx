// ============================================================
// Profile.jsx — หน้าโปรไฟล์ผู้ใช้
//
// หน้าที่: แสดงข้อมูลบัญชี คะแนนสะสม ลิงก์ไปหน้าต่างๆ
//
// ส่วนที่แสดง:
//   - ชื่อ / อีเมล / เบอร์โทร / บทบาท (user / entrepreneur / admin)
//   - คะแนนสะสม (current_points) + ลิงก์ไปหน้าเกม
//   - ถ้าเป็น entrepreneur: แสดงสถานะ + ลิงก์ไป Dashboard
//   - ปุ่ม: ประวัติคำสั่งซื้อ, ออกจากระบบ
//
// API: GET /profile (ต้องมี JWT token)
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  FaUser, FaStore, FaShieldHalved, FaClipboardList,
  FaArrowRightFromBracket, FaPlus, FaPhone, FaIdCard, FaBasketShopping, FaCircleCheck, FaHand, FaHourglassHalf,
} from 'react-icons/fa6';
import Footer from './Footer';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';
import API_URL, { secureLocalFetch } from './config';
import useCartCount from './useCartCount';

const NAV = [
  { label: "หน้าแรก",   icon: <MdHome size={18}/>,                path: "/homepage" },
  { label: "ตลาดน้ำ",   icon: <MdStorefront size={18}/>,           path: "/market"   },
  { label: "เกม",       icon: <MdOutlineSportsEsports size={18}/>, path: "/game"     },
  { label: "ช่วยเหลือ", icon: <MdHelpOutline size={18}/>,          path: "/help"     },
];

function Profile() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const cartCount    = useCartCount();
  const [user,         setUser]         = useState(null);
  const [entrepreneur, setEntrepreneur] = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/'); return; }
    secureLocalFetch(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.status === 401) throw new Error('Unauthorized');
        if (!res.ok) throw new Error(`HTTP ERROR ${res.status}`);
        return res.json();
      })
      .then(data => {
        setUser(data.user);
        if (data.user?.user_id) fetchEntrepreneur(data.user.user_id);
        else { setLoading(false); handleRedirect(); }
      })
      .catch(err => {
        if (err.message === 'Unauthorized') { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/'); }
      });
  }, [navigate]);

  const fetchEntrepreneur = async (userId) => {
    try {
      const res = await secureLocalFetch(`${API_URL}/entrepreneur/${userId}`);
      if (res.ok) setEntrepreneur(await res.json());
    } catch {}
    finally { setLoading(false); handleRedirect(); }
  };

  const handleRedirect = () => {
    const r = localStorage.getItem('redirectTo');
    if (r && r !== '/profile') { localStorage.removeItem('redirectTo'); navigate(r); }
  };

  useEffect(() => { if (!loading) handleRedirect(); }, [loading]);

  const handleLogout = () => { localStorage.removeItem('user'); localStorage.removeItem('token'); navigate('/'); };

  const fullName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username || 'ผู้ใช้';

  const initials = user?.first_name
    ? user.first_name.charAt(0).toUpperCase()
    : (user?.username || 'U').charAt(0).toUpperCase();

  /* ── Navbar ─────────────────────────────────────────────────── */
  const Navbar = () => (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="rsp-header-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <button onClick={() => navigate("/homepage")} style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}>
          <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height: 45, width: "auto", objectFit: "contain" }} />
        </button>
        <nav className="rsp-desktop-nav" style={{ display: "flex", gap: 4 }}>
          {NAV.map(n => {
            const active = location.pathname === n.path;
            return <button key={n.label} onClick={() => navigate(n.path)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400, background: active ? "#edf3ff" : "transparent", color: active ? "#4b8ff4" : "#475569", transition: "all 0.15s" }}>{n.icon} <span className="rsp-nav-label">{n.label}</span></button>;
          })}
        </nav>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/cart")} className="nb-icon-btn" style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", transition: "all 0.15s" }}>
            <i className="fas fa-basket-shopping" style={{ fontSize: 17 }} />
            {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
          </button>
          <button onClick={() => navigate("/profile")} className="nb-icon-btn" style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid rgba(141,77,17,0.25)", background: "#fff8f0", color: "#8d4d11", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
            <i className="fas fa-user-circle" style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>
    </header>
  );

  if (loading) return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f4f2ef", minHeight: "100vh" }}>
      <Navbar />
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ maxWidth: 600, margin: "48px auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {[1,2,3].map(i => <div key={i} style={{ height: 140, borderRadius: 20, background: "linear-gradient(90deg,#ede9e3 25%,#e0dbd4 50%,#ede9e3 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />)}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f4f2ef", minHeight: "100vh", color: "#0f172a" }}>
      <style>{`
        @keyframes profile-in { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .profile-card { animation: profile-in 0.4s ease both; }
        .profile-action-btn:hover { opacity: 0.88 !important; transform: translateY(-1px) !important; }
        .profile-logout:hover { background: #fff0e8 !important; border-color: #8d4d11 !important; }
      `}</style>
      <Navbar />

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "32px 16px 100px" }}>

        {/* ── Hero card ────────────────────────────────────────── */}
        <div className="profile-card" style={{
          background: "linear-gradient(135deg,#8d4d11 0%,#6b3a0d 60%,#4a2a0a 100%)",
          borderRadius: 24, padding: "36px 28px 32px",
          marginBottom: 16, textAlign: "center", position: "relative", overflow: "hidden",
          boxShadow: "0 8px 32px rgba(141,77,17,0.28)",
          animationDelay: "0s",
        }}>
          {/* decorative circles */}
          <div style={{ position:"absolute", top:-40, right:-40, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
          <div style={{ position:"absolute", bottom:-30, left:-30, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />

          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
            border: "3px solid rgba(255,255,255,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", backdropFilter: "blur(8px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>{initials}</span>
          </div>

          {/* Greeting */}
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 500, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>ยินดีต้อนรับกลับมา <FaHand /></p>

          {/* Name */}
          <h1 style={{ margin: "0 0 10px", fontWeight: 900, fontSize: "clamp(1.3rem,4vw,1.7rem)", color: "#fff", letterSpacing: "-0.02em" }}>
            {fullName}
          </h1>

          {/* Email — centered, single */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "rgba(255,255,255,0.14)", backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: 999, padding: "7px 18px", marginBottom: 22,
          }}>
            <i className="fas fa-envelope" style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }} />
            <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{user?.email || '—'}</span>
          </div>

          {/* Status badge */}
          <div style={{ marginBottom: 22 }}>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 999,
              background: user?.is_active ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
              color: user?.is_active ? "#86efac" : "#fca5a5",
              border: `1px solid ${user?.is_active ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
            }}>
              {user?.is_active ? "ใช้งานได้" : "ถูกปิดใช้งาน"}
            </span>
          </div>

          {/* Logout */}
          <button onClick={handleLogout} className="profile-logout"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 22px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", backdropFilter: "blur(6px)" }}
          >
            <FaArrowRightFromBracket style={{ fontSize: 13 }} /> ออกจากระบบ
          </button>
        </div>

        {/* ── Info strip ───────────────────────────────────────── */}
        <div className="profile-card" style={{
          background: "#fff8f0", borderRadius: 20,
          border: "1.5px solid rgba(141,77,17,0.12)",
          padding: "20px 24px", marginBottom: 16,
          boxShadow: "0 2px 12px rgba(141,77,17,0.07)",
          display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 20,
          animationDelay: "0.07s",
        }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#b89a7a", textTransform: "uppercase", letterSpacing: "0.1em" }}>User ID</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#8d4d11" }}>#{user?.user_id}</p>
          </div>
          {(user?.first_name || user?.last_name) && (
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#b89a7a", textTransform: "uppercase", letterSpacing: "0.1em" }}>ชื่อ-นามสกุล</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#3d1a05" }}>{user.first_name} {user.last_name}</p>
            </div>
          )}
          {user?.phone && (
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#b89a7a", textTransform: "uppercase", letterSpacing: "0.1em" }}>เบอร์โทร</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#3d1a05" }}>{user.phone}</p>
            </div>
          )}
        </div>

        {/* ── My Orders ─────────────────────────────────────────── */}
        <div className="profile-card" style={{
          background: "#fff", borderRadius: 20,
          border: "1px solid #ede9e3", padding: "20px 24px",
          marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
          animationDelay: "0.14s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#fff8f0,#ffe8d4)", border: "1.5px solid rgba(141,77,17,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FaClipboardList style={{ color: "#8d4d11", fontSize: 20 }} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 15, color: "#0f172a", display:'flex', alignItems:'center', gap:8 }}><FaBasketShopping />คำสั่งซื้อของฉัน</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>ดูประวัติการซื้อและสถานะคำสั่งซื้อของคุณ</p>
            </div>
          </div>
          <button onClick={() => navigate("/user-orders")} className="profile-action-btn"
            style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#8d4d11,#6b3a0d)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 12px rgba(141,77,17,0.28)", whiteSpace: "nowrap", transition: "all 0.15s" }}
          >
            ดูคำสั่งซื้อ →
          </button>
        </div>

        {/* ── Entrepreneur / Shop section ───────────────────────── */}
        {entrepreneur ? (
          <div className="profile-card" style={{
            background: "#fff", borderRadius: 20,
            border: "1px solid #ede9e3", padding: "22px 24px",
            marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            animationDelay: "0.21s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#fff8f0,#ffe8d4)", border: "1.5px solid rgba(141,77,17,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FaStore style={{ color: "#8d4d11", fontSize: 15 }} />
              </div>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#0f172a" }}>ข้อมูลร้านค้าของคุณ</h2>
              <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: entrepreneur?.is_verified === 1 ? "#f0fdf4" : "#fff8f0", color: entrepreneur?.is_verified === 1 ? "#166534" : "#5c2c08", border: `1px solid ${entrepreneur?.is_verified === 1 ? "#bbf7d0" : "rgba(141,77,17,0.25)"}` }}>
                {entrepreneur?.is_verified === 1 ? "อนุมัติแล้ว" : "รอการอนุมัติ"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "14px 20px", marginBottom: entrepreneur?.is_verified === 1 ? 20 : 0 }}>
              {[
                ["รหัส", entrepreneur?.entrepreneurs_id || entrepreneur?.shop_id],
                ["ชื่อร้านค้า", entrepreneur?.shop_name],
                ["ประเภท", entrepreneur?.category],
              ].map(([label, val]) => (
                <div key={label}>
                  <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: "#b89a7a", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#3d1a05" }}>{val || "—"}</p>
                </div>
              ))}
            </div>

            {entrepreneur?.is_verified === 1 && (
              <button onClick={() => navigate("/entrepreneur-dashboard")} className="profile-action-btn"
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,#8d4d11,#6b3a0d)", border: "none", color: "#fff", boxShadow: "0 4px 16px rgba(141,77,17,0.28)", transition: "all 0.15s" }}
              >
                <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}><FaStore />จัดการร้านค้า (Dashboard)</span>
              </button>
            )}

            {entrepreneur?.is_verified === 0 && (
              <div style={{ marginTop: 14, padding: "12px 16px", background: "#fff8f0", border: "1px solid rgba(141,77,17,0.2)", borderRadius: 10, fontSize: 13, color: "#5c2c08", fontWeight: 500 }}>
                ⏳ ร้านค้าของคุณอยู่ระหว่างการตรวจสอบจากแอดมิน กรุณารอสักครู่
              </div>
            )}
          </div>
        ) : (
          <div className="profile-card" style={{
            background: "#fff", borderRadius: 20,
            border: "1px solid #ede9e3", padding: "36px 24px",
            marginBottom: 16, textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            animationDelay: "0.21s",
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#fff8f0,#ede9e3)", border: "1.5px solid rgba(141,77,17,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <FaStore style={{ color: "#c4956a", fontSize: 26 }} />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", margin: "0 0 6px" }}>คุณยังไม่มีร้านค้า</h3>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 20px" }}>คลิกเพื่อสมัครร้านค้าของคุณ</p>
            <Link to="/addshop" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 12, background: "linear-gradient(135deg,#8d4d11,#6b3a0d)", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 16px rgba(141,77,17,0.28)" }}>
              <FaPlus style={{ fontSize: 12 }} /> สมัครร้านค้า
            </Link>
          </div>
        )}

        {/* ── Admin section ─────────────────────────────────────── */}
        {user?.role === 'Admin' && (
          <div className="profile-card" style={{
            background: "#fff", borderRadius: 20,
            border: "1px solid rgba(141,77,17,0.15)", padding: "20px 24px",
            boxShadow: "0 2px 10px rgba(141,77,17,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
            animationDelay: "0.28s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#fff8f0,#ffe8d4)", border: "1.5px solid rgba(141,77,17,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FaShieldHalved style={{ color: "#8d4d11", fontSize: 20 }} />
              </div>
              <div>
                <h3 style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 15, color: "#0f172a", display:'flex', alignItems:'center', gap:8 }}><FaShieldHalved />ผู้ดูแลระบบ</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>เข้าถึง Admin Dashboard เพื่อจัดการระบบ</p>
              </div>
            </div>
            <button onClick={() => navigate("/admin")} className="profile-action-btn"
              style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#8d4d11,#6b3a0d)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 12px rgba(141,77,17,0.28)", whiteSpace: "nowrap", transition: "all 0.15s" }}
            >
              เข้า Admin →
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Profile;
