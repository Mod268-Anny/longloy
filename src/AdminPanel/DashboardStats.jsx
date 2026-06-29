// ============================================================
// AdminPanel/DashboardStats.jsx — สถิติสรุปสำหรับแดชบอร์ดแอดมิน
//
// หน้าที่: แสดง card สรุปตัวเลขสำคัญของระบบ
//
// ข้อมูลที่แสดง (GET /admin/stats):
//   - จำนวนผู้ใช้ทั้งหมด / นักท่องเที่ยว / ผู้ประกอบการ
//   - ผู้ประกอบการที่รอการอนุมัติ
//   - ผู้ใช้ที่ถูกแบน / คำสั่งซื้อทั้งหมด
//
// ใช้ใน: AdminDashboard.jsx tab "dashboard"
// ============================================================
import React, { useState, useEffect } from 'react';
import { FaUsers, FaBriefcase, FaStore, FaClock, FaBan, FaCartShopping, FaChartColumn, FaTriangleExclamation } from 'react-icons/fa6';
import API_URL, { secureLocalFetch } from '../config';

const STAT_CARDS = [
  { key: "total_users",          icon: <FaUsers size={20} />, label: "ผู้ใช้ทั้งหมด",      color: "#4b8ff4", bg: "#edf3ff", border: "#b8d4fb" },
  { key: "total_tourists",       icon: <FaBriefcase size={20} />, label: "นักท่องเที่ยว",       color: "#4b8ff4", bg: "#edf3ff", border: "#b8d4fb" },
  { key: "total_entrepreneurs",  icon: <FaStore size={20} />, label: "ผู้ประกอบการ",        color: "#4b8ff4", bg: "#edf3ff", border: "#b8d4fb" },
  { key: "pending_entrepreneurs",icon: <FaClock size={20} />, label: "รอการอนุมัติ",        color: "#8d4d11", bg: "#fff8f0", border: "#d4880a" },
  { key: "banned_users",         icon: <FaBan size={20} />, label: "ผู้ใช้ที่ถูกแบน",    color: "#8d4d11", bg: "#fff0e8", border: "#ffe8d4" },
  { key: "total_orders",         icon: <FaCartShopping size={20} />, label: "คำสั่งซื้อทั้งหมด",  color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
];

function DashboardStats({ token }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    secureLocalFetch(`${API_URL}/admin/dashboard-stats`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
      .then(r => r.json())
      .then(data => { if (data.stats) setStats(data.stats); else setError('ไม่สามารถดึงข้อมูลได้'); setLoading(false); })
      .catch(() => { setError('เกิดข้อผิดพลาด'); setLoading(false); });
  }, []);

  if (loading) return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 16, marginBottom: 24 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ height: 110, borderRadius: 16, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        ))}
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: "13px 16px", borderRadius: 10, background: "#fff0e8", border: "1px solid #ffe8d4", color: "#4a2008", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><FaTriangleExclamation /> {error}</div>
  );

  return (
    <div>
      <h2 style={{ fontWeight: 800, fontSize: 17, color: "#0f172a", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 }}><FaChartColumn /> สถิติภาพรวม</h2>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 16, marginBottom: 28 }}>
        {STAT_CARDS.map(c => (
          <div key={c.key} style={{
            background: c.bg, borderRadius: 16, padding: "20px 18px",
            border: `1px solid ${c.border}`, transition: "transform 0.2s, box-shadow 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 20px ${c.color}25`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ fontSize: 28, marginBottom: 10, display: "flex", alignItems: "center" }}>{c.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: c.color, lineHeight: 1, marginBottom: 6 }}>
              {stats?.[c.key] ?? "—"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.color, opacity: 0.8 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Summary table */}
      <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #f1f5f9" }}>
        {/* Header */}
        <div style={{ padding: "13px 20px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", margin: 0 }}>สรุปข้อมูลสำคัญ</h3>
        </div>
        {/* Rows */}
        {STAT_CARDS.map((c, i) => (
          <div key={c.key} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "13px 20px",
            background: i % 2 === 0 ? "#ffffff" : "#fafafa",
            borderBottom: i < STAT_CARDS.length - 1 ? "1px solid #f1f5f9" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: "#334155", fontWeight: 500 }}>{c.label}</span>
            </div>
            <span style={{
              fontWeight: 800, fontSize: 16, color: c.color,
              background: c.bg, padding: "3px 14px", borderRadius: 20,
              border: `1px solid ${c.border}`,
            }}>
              {stats?.[c.key] ?? "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardStats;
