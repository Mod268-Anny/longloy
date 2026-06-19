// ตัวอย่างฟังก์ชัน checkoutCart สำหรับ React frontend
// เรียกใช้งาน API /orders/checkout
// ต้องแนบ token ใน header

import API_URL, { secureLocalFetch } from '../config';

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
  return data; // { success, order_id, amount, email, fullName, publicKey, payment_method }
}

// Create charge with Omise
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
  return data; // { success: true, charge_id, status, amount, message }
}

// Get Omise public key
export async function getOmisePublicKey() {
  const res = await secureLocalFetch(`${API_URL}/payments/token`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get public key');
  return data.publicKey;
}

// วิธีใช้ใน React component
// import { checkoutCart, createCharge, getOmisePublicKey } from './api/checkoutCart';
//
// async function handleCheckout() {
//   try {
//     // Step 1: Create order
//     const result = await checkoutCart({ shop_id, address, note, token, cartItems });
//     // Step 2: Redirect to payment page with result data
//     navigate('/payment', { state: result });
//   } catch (e) {
//     alert(e.message);
//   }
// }

