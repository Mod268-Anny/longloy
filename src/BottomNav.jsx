// ============================================================
// BottomNav.jsx — แถบนำทางด้านล่าง (Mobile Bottom Navigation)
//
// หน้าที่: แสดงเมนูหลัก 4 ปุ่มที่ด้านล่างหน้าจอบนมือถือ
//         ไฮไลต์ปุ่มที่ active ตาม pathname ปัจจุบัน
//
// ใช้ใน: หน้าต่างๆ ผ่าน responsive.css ซ่อนบน desktop แสดงบน mobile
// ============================================================
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';

const NAV = [
  { label: 'หน้าแรก',   Icon: MdHome,                  path: '/homepage' },
  { label: 'ตลาดน้ำ',   Icon: MdStorefront,             path: '/market'   },
  { label: 'เกม',       Icon: MdOutlineSportsEsports,   path: '/game'     },
  { label: 'ช่วยเหลือ', Icon: MdHelpOutline,             path: '/help'     },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="rsp-bottom-nav" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 998,
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom, 4px)',
    }}>
      {NAV.map(({ label, Icon, path }) => {
        const active = location.pathname === path || location.pathname.startsWith(path + '/');
        return (
          <button key={path} onClick={() => navigate(path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '8px 4px 6px', background: 'none', border: 'none',
              cursor: 'pointer', color: active ? '#4b8ff4' : '#94a3b8',
              transition: 'color 0.15s',
            }}>
            <Icon size={23} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, lineHeight: 1.2 }}>
              {label}
            </span>
            {active && (
              <span style={{
                position: 'absolute', bottom: 'env(safe-area-inset-bottom, 4px)',
                width: 4, height: 4, borderRadius: '50%', background: '#4b8ff4',
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
