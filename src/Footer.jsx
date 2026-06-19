import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaFacebook, FaInstagram, FaLine } from 'react-icons/fa6';

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer style={{ background: "#0f172a", color: "#94a3b8", padding: "48px 24px 32px", borderTop: "1px solid #1e293b" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* Top row */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 40, marginBottom: 40 }}>

          {/* Brand */}
          <div style={{ minWidth: 200 }}>
            <button
              onClick={() => navigate('/homepage')}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 14, display: "block" }}
            >
              <img src="/logo-longloy.png" alt="LongLoy" style={{ height: 44, width: "auto", objectFit: "contain" }} />
            </button>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, maxWidth: 260, margin: 0 }}>
              แพลตฟอร์มท่องเที่ยวตลาดน้ำ ค้นพบร้านค้า กิจกรรม และประสบการณ์ใหม่ ๆ ทั่วประเทศไทย
            </p>
          </div>

          {/* Links */}
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", margin: "0 0 14px" }}>เมนู</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "หน้าแรก", path: "/homepage" },
                  { label: "ตลาดน้ำ", path: "/market" },
                  { label: "เกม",    path: "/game" },
                  { label: "ช่วยเหลือ", path: "/help" },
                ].map(({ label, path }) => (
                  <button
                    key={label}
                    onClick={() => navigate(path)}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, textAlign: "left", padding: 0, transition: "color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#e2e8f0"}
                    onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", margin: "0 0 14px" }}>บัญชี</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "โปรไฟล์", path: "/profile" },
                  { label: "คำสั่งซื้อ", path: "/user-orders" },
                  { label: "ตะกร้า",  path: "/cart" },
                ].map(({ label, path }) => (
                  <button
                    key={label}
                    onClick={() => navigate(path)}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, textAlign: "left", padding: 0, transition: "color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#e2e8f0"}
                    onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Social */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", margin: "0 0 14px" }}>ติดตามเรา</p>
            <div style={{ display: "flex", gap: 12 }}>
              {[FaFacebook, FaInstagram, FaLine].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "#1e293b", border: "1px solid #334155",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#64748b", fontSize: 17, transition: "all 0.2s",
                    textDecoration: "none",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#334155"; e.currentTarget.style.color = "#e2e8f0"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#64748b"; }}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#1e293b", marginBottom: 24 }} />

        {/* Bottom row */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p style={{ fontSize: 13, margin: 0, color: "#475569" }}>
            © 2026 LongLoy — การช้อปปิ้งตลาดน้ำกรุงเทพมหานคร. สงวนลิขสิทธิ์.
          </p>
          <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#475569" }}>
            <span>นโยบายความเป็นส่วนตัว</span>
            <span>เงื่อนไขการใช้งาน</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
