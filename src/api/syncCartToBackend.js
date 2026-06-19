// src/api/syncCartToBackend.js
// เรียกใช้หลังจากเพิ่มสินค้าลง localStorage cart เพื่อ sync ไป backend
import API_URL, { secureLocalFetch } from '../config';

export async function syncCartToBackend(cartItems, token) {
  if (!token) return;
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
