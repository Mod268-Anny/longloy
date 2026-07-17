// shopHours.js — เช็คว่าร้านเปิดอยู่จริงตอนนี้หรือไม่ (เทียบเวลาปัจจุบันกับ open_time/close_time)
// รองรับร้านที่เปิดข้ามคืน (เช่น เปิด 18:00 ปิด 02:00)

function toMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// shop: { status, open_time, close_time }
export function isShopOpenNow(shop) {
  if (!shop) return false;
  if (shop.status && shop.status !== 'Open') return false;

  const openMin = toMinutes(shop.open_time);
  const closeMin = toMinutes(shop.close_time);
  if (openMin === null || closeMin === null) return shop.status === 'Open';
  if (openMin === closeMin) return true; // เปิด 24 ชม.

  const now = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();

  if (openMin < closeMin) {
    return curMin >= openMin && curMin < closeMin;
  }
  // ข้ามเที่ยงคืน เช่น เปิด 18:00 ปิด 02:00
  return curMin >= openMin || curMin < closeMin;
}
