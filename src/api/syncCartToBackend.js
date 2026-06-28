// ============================================================
// syncCartToBackend.js — Sync ตะกร้าจาก localStorage ขึ้น backend
//
// หน้าที่: วนส่งสินค้าแต่ละรายการใน cartItems ไปยัง POST /cart/add
//         ใช้หลังจาก login เพื่อ backup cart ที่ค้างไว้ใน localStorage
//
// หมายเหตุ: ถ้าไม่มี token (ยังไม่ login) จะไม่ทำอะไร
// ============================================================

import API_URL, { secureLocalFetch } from '../config';

export async function syncCartToBackend(cartItems, token) {
  if (!token) return; // ยังไม่ login → ข้ามไป

  // ส่งทีละ item (sequential เพื่อไม่ flood server)
  for (const item of cartItems) {
    await secureLocalFetch(`${API_URL}/cart/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ product_id: item.product_id, qty: item.qty })
    });
  }
}
