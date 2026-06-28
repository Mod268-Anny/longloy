// ============================================================
// useCartCount.js — Custom Hook นับจำนวนสินค้าในตะกร้า
//
// หน้าที่: อ่านจำนวน qty รวมจาก localStorage แล้ว return เป็น state
//         อัปเดตอัตโนมัติเมื่อตะกร้าเปลี่ยน (ผ่าน custom event)
//
// ใช้ใน: Navbar, BottomNav, FloatingCart (แสดงเลขแดงบนไอคอนตะกร้า)
// ============================================================

import { useState, useEffect } from 'react';

// ── อ่าน qty รวมจาก localStorage ─────────────────────────────
// cart เก็บเป็น array ของ { product_id, qty, ... } ใน key "cart"
const getCount = () => {
  try {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    return cart.reduce((s, i) => s + (i.qty || 0), 0);
  } catch { return 0; }
};

export default function useCartCount() {
  const [count, setCount] = useState(getCount);

  useEffect(() => {
    const update = () => setCount(getCount());

    // ฟัง 2 event:
    //   "storage"      — เมื่อ tab อื่นแก้ localStorage
    //   "cart-updated" — custom event ที่ Cart.jsx ยิงหลังแก้ตะกร้า
    window.addEventListener('storage', update);
    window.addEventListener('cart-updated', update);

    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('cart-updated', update);
    };
  }, []);

  return count;
}
