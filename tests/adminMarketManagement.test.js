const test = require('node:test');
const assert = require('node:assert/strict');
const { buildProductPayload, buildShopPayload } = require('../src/AdminPanel/marketManagementUtils');

test('buildProductPayload keeps only populated product fields', () => {
  const payload = buildProductPayload({
    name: 'ข้าวเหนียว',
    price: '45',
    description: 'อร่อย',
    is_available: true,
    image_url: ''
  });

  assert.deepEqual(payload, {
    name: 'ข้าวเหนียว',
    price: 45,
    description: 'อร่อย',
    is_available: 1
  });
});

test('buildShopPayload converts status and market id', () => {
  const payload = buildShopPayload({
    shop_name: 'ร้านใหม่',
    description: 'ดี',
    phone_number: '0811111111',
    location: 'ตลาดน้ำ',
    market_id: '101',
    status: 'Closed',
    image_url: '/uploads/test.jpg'
  });

  assert.deepEqual(payload, {
    shop_name: 'ร้านใหม่',
    description: 'ดี',
    phone_number: '0811111111',
    location: 'ตลาดน้ำ',
    market_id: 101,
    status: 'Closed',
    image_url: '/uploads/test.jpg'
  });
});
