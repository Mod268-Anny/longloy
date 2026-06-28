// ============================================================
// Navbar.jsx — แถบนำทางด้านบน (Sticky Header)
//
// หน้าที่: แสดง Logo, เมนูหลัก 4 รายการ, ปุ่มตะกร้า (พร้อม badge), ปุ่มโปรไฟล์
//
// ใช้ใน: หน้าต่างๆ ที่ต้องการ Navbar แบบ standalone (ไม่ใช่หน้าที่มี Navbar built-in)
// หมายเหตุ: บางหน้าเช่น Homepage.jsx มี Navbar ฝังอยู่ในตัว ไม่ได้ใช้ component นี้
// ============================================================
import { useNavigate, useLocation } from 'react-router-dom';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';
import useCartCount from './useCartCount';

const NAV = [
  { label: "หน้าแรก",   icon: <MdHome size={18} />,                path: "/homepage" },
  { label: "ตลาดน้ำ",   icon: <MdStorefront size={18} />,           path: "/market"   },
  { label: "เกม",       icon: <MdOutlineSportsEsports size={18} />, path: "/game"     },
  { label: "ช่วยเหลือ", icon: <MdHelpOutline size={18} />,          path: "/help"     },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const cartCount = useCartCount();

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(255,255,255,0.95)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div className="rsp-header-inner" style={{
        maxWidth: 1280, margin: "0 auto", padding: "0 24px",
        height: 68, display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 16,
      }}>
        {/* Logo */}
        <button
          onClick={() => navigate("/homepage")}
          style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}
        >
          <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height: 45, width: "auto", objectFit: "contain" }} />
        </button>

        {/* Nav links */}
        <nav className="rsp-desktop-nav" style={{ display: "flex", gap: 4 }}>
          {NAV.map(n => {
            const active = location.pathname === n.path;
            return (
              <button key={n.label} onClick={() => navigate(n.path)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 8, border: "none",
                cursor: "pointer", fontSize: 14,
                fontWeight: active ? 600 : 400,
                background: active ? "#edf3ff" : "transparent",
                color: active ? "#4b8ff4" : "#475569",
                transition: "all 0.15s",
              }}>
                {n.icon} <span className="rsp-nav-label">{n.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Cart + Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(() => {
            const cartActive = location.pathname === "/cart";
            const profileActive = location.pathname === "/profile";
            return (<>
              <button onClick={() => navigate("/cart")} className="nb-icon-btn" style={{ width: 40, height: 40, borderRadius: 10, border: cartActive ? "1px solid rgba(141,77,17,0.25)" : "1px solid #e2e8f0", background: cartActive ? "#fff8f0" : "#fff", color: cartActive ? "#8d4d11" : "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", transition: "all 0.15s" }}>
                <i className="fas fa-basket-shopping" style={{ fontSize: 17 }} />
                {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: cartActive ? "#8d4d11" : "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>}
              </button>
              <button onClick={() => navigate("/profile")} className="nb-icon-btn" style={{ width: 40, height: 40, borderRadius: 10, border: profileActive ? "1px solid rgba(141,77,17,0.25)" : "1px solid #e2e8f0", background: profileActive ? "#fff8f0" : "#fff", color: profileActive ? "#8d4d11" : "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                <i className="fas fa-user-circle" style={{ fontSize: 18 }} />
              </button>
            </>);
          })()}
        </div>
      </div>
    </header>
  );
}
