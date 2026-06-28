// ============================================================
// FloatingCart.jsx — ไอคอนตะกร้าลอยตัว (Floating Action Button)
//
// หน้าที่: แสดงปุ่มตะกร้าที่มุมขวาล่าง พร้อม badge จำนวนสินค้า
//         มี animation "bump" เมื่อจำนวนสินค้าเพิ่มขึ้น
//
// ใช้ใน: Homepage, ShopProfile, ShopPage, ProductDetail ฯลฯ
// ซ่อนอัตโนมัติ: เมื่ออยู่หน้า /cart (ไม่แสดงซ้อน)
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBasketShopping } from 'react-icons/fa6';
import useCartCount from './useCartCount';

export default function FloatingCart() {
  const navigate  = useNavigate();
  const count     = useCartCount();
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (count === 0) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 350);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <>
      <style>{`
        @keyframes cartBump{0%{transform:scale(1)}40%{transform:scale(1.22)}100%{transform:scale(1)}}
        .fc-btn:hover{transform:scale(1.1)!important;box-shadow:0 10px 36px rgba(141,77,17,0.55)!important;}
        @media(max-width:640px){.fc-btn{bottom:20px!important;right:16px!important;width:52px!important;height:52px!important;}}
      `}</style>
      <button
        className="fc-btn"
        onClick={() => navigate('/cart')}
        style={{
          position: 'fixed', bottom: 28, right: 24, zIndex: 1000,
          width: 58, height: 58, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg,#8d4d11,#6b3a0d)',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(141,77,17,0.42)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          animation: bump ? 'cartBump 0.35s ease' : 'none',
        }}
      >
        <FaBasketShopping style={{ fontSize: 23 }} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            minWidth: 20, height: 20, borderRadius: 999,
            background: '#ef4444', color: '#fff',
            fontSize: 11, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid #fff',
            boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
    </>
  );
}
