// ============================================================
// checkoutCart.js — API helpers สำหรับขั้นตอนการชำระเงิน
//
// ฟังก์ชันที่มี:
//   checkoutCart()      — สร้าง order ใน DB + คำนวณยอด + ใช้คูปอง
//   createCharge()      — ส่งบัตรเครดิตไปชาร์จผ่าน Omise API
//   getOmisePublicKey() — ดึง public key สำหรับ Omise.js (frontend tokenize)
//
// ลำดับการใช้งาน:
//   1. checkoutCart()      → ได้ order_id + amount
//   2. Omise.js tokenize card → ได้ card token
//   3. createCharge()      → ชาร์จเงินจริง
// ============================================================

import API_URL, { secureLocalFetch } from '../config';

// ── Step 1: สร้าง order และเตรียมข้อมูลสำหรับชำระเงิน ────────
// คืนค่า: { success, order_id, amount (satang), email, fullName, publicKey, payment_method }
export async function checkoutCart({ shop_id, address = '', note = '', token, cartItems = [], coupon_code = '', payment_method = 'card', redeem_id = null }) {
  const res = await secureLocalFetch(`${API_URL}/orders/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ shop_id, address, note, cartItems, coupon_code, payment_method, redeem_id })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Checkout failed');
  return data;
}

// ── Step 3: ชาร์จบัตรเครดิตผ่าน Omise ────────────────────────
// token = card token จาก Omise.js, amount = satang
// คืนค่า: { success, charge_id, status, amount, message }
export async function createCharge({ order_id, token, amount, email, userToken }) {
  const res = await secureLocalFetch(`${API_URL}/payments/create-charge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ order_id, token, amount, email })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Payment failed');
  return data;
}

// ── ดึง Omise Public Key สำหรับ tokenize บัตรฝั่ง frontend ─────
export async function getOmisePublicKey() {
  const res = await secureLocalFetch(`${API_URL}/payments/token`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get public key');
  return data.publicKey;
}
