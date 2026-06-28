// ============================================================
// AdminDashboard.jsx — หน้าแดชบอร์ดสำหรับแอดมิน
//
// หน้าที่: ศูนย์รวมการจัดการระบบทั้งหมด (เฉพาะ role=admin)
//
// แท็บที่มี:
//   - dashboard        → สถิติรวม (DashboardStats + RealtimeStatsChart)
//   - users            → จัดการผู้ใช้ (UserManagement)
//   - entrepreneurs    → อนุมัติผู้ประกอบการ (EntrepreneurApprovals)
//   - all-entrepreneurs→ รายชื่อผู้ประกอบการทั้งหมด
//   - game-content     → จัดการเนื้อหาเกม (GameContent: quests/rewards/quiz)
//   - coupons          → จัดการคูปองส่วนลด (CouponManagement)
//
// ป้องกัน: redirect ถ้า localStorage user.role ไม่ใช่ "admin"
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import API_URL, { secureLocalFetch } from './config';
import UserManagement from './AdminPanel/UserManagement';
import EntrepreneurApprovals from './AdminPanel/EntrepreneurApprovals';
import DashboardStats from './AdminPanel/DashboardStats';
import RealtimeStatsChart from './RealtimeStatsChart';
import GameContent from './AdminPanel/GameContent';

import CouponManagement from './AdminPanel/CouponManagement';

const TABS = [
  { key: "dashboard",        icon: "📊", label: "สถิติ" },
  { key: "users",            icon: "👥", label: "จัดการผู้ใช้" },

  { key: "entrepreneurs",    icon: "✅", label: "อนุมัติผู้ประกอบการ" },
  { key: "all-entrepreneurs",icon: "📋", label: "ผู้ประกอบการทั้งหมด" },
  { key: "game-content",     icon: "🎮", label: "เนื้อหาเกม" },
  { key: "coupons",          icon: "🎟️", label: "จัดการคูปอง" },
];

function AdminDashboard() {
  const navigate   = useNavigate();
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    secureLocalFetch(`${API_URL}/profile`, { method: 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .then(data => {
        if (data.user?.role === 'Admin') { setUser(data.user); setLoading(false); }
        else { setError('คุณไม่มีสิทธิ์เข้าถึงหน้านี้'); navigate('/'); }
      })
      .catch(() => { setError('เกิดข้อผิดพลาด'); navigate('/'); });
  }, [token, navigate]);

  if (loading) return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ position: "sticky", top: 0, height: 68, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0" }} />
      <div style={{ maxWidth: 1200, margin: "48px auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ height: 100, borderRadius: 16, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        ))}
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#0f172a" }}>

      <main className="rsp-main" style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* ── Admin header ──────────────────────────────────────── */}
        <div style={{ background: "linear-gradient(135deg,#8d4d11,#6b3a0d)", borderRadius: 20, padding: "28px 32px", marginBottom: 28, position: "relative", overflow: "hidden", boxShadow: "0 8px 28px rgba(141,77,17,0.28)" }}>
          <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 6px" }}>Admin Dashboard</p>
              <h1 style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(1.3rem,3vw,1.8rem)", margin: "0 0 4px" }}>
                🛡️ ยินดีต้อนรับ {user?.first_name} {user?.last_name}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0 }}>จัดการระบบ LongLoy Market</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.15)", color: "#fff",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                backdropFilter: "blur(8px)", flexShrink: 0,
              }}
            >
              ออกจากระบบ
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fff0e8", border: "1px solid #ffe8d4", borderRadius: 12, padding: "13px 18px", marginBottom: 20, color: "#4a2008", fontSize: 14 }}>⚠️ {error}</div>
        )}

        {/* ── Tab bar ───────────────────────────────────────────── */}
        <div className="rsp-tabs" style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
                borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                background: activeTab === t.key ? "linear-gradient(135deg,#4b8ff4,#4b8ff4)" : "#fff",
                color: activeTab === t.key ? "#fff" : "#475569",
                boxShadow: activeTab === t.key ? "0 4px 14px rgba(75,143,244,0.3)" : "0 1px 4px rgba(0,0,0,0.06)",
                border: activeTab === t.key ? "none" : "1px solid #f1f5f9",
                transition: "all 0.2s",
              }}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ───────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          {activeTab === "dashboard"         && (
            <>
              <RealtimeStatsChart token={token} />
              <DashboardStats token={token} />
            </>
          )}
          {activeTab === "users"             && <UserManagement token={token} />}

          {activeTab === "entrepreneurs"     && <EntrepreneurApprovals token={token} view="pending" />}
          {activeTab === "all-entrepreneurs" && <EntrepreneurApprovals token={token} view="all" />}
          {activeTab === "game-content"      && <GameContent token={token} />}
          {activeTab === "coupons"           && <CouponManagement token={token} />}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AdminDashboard;
