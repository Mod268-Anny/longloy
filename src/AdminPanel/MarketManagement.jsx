import React, { useEffect, useState } from 'react';
import { FaPen, FaStore, FaTrash, FaTriangleExclamation } from 'react-icons/fa6';
import API_URL, { secureLocalFetch } from '../config';
import marketManagementUtils from './marketManagementUtils';

const { buildProductPayload, buildShopPayload } = marketManagementUtils;

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 14,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

function MarketManagement() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingShop, setEditingShop] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'shop'|'product', id, name, image_url }
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    description: '',
    image_url: '',
    is_available: true,
  });
  const [shopForm, setShopForm] = useState({
    shop_name: '',
    description: '',
    phone_number: '',
    location: '',
    market_id: '',
    status: 'Open',
    image_url: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const marketsRes = await secureLocalFetch(`${API_URL}/floating-markets/all`);
      const marketsData = await marketsRes.json();

      const detailPromises = (marketsData || []).map(async (market) => {
        const shopsRes = await secureLocalFetch(`${API_URL}/shops/by-market/${market.market_id}`);
        const shopsData = await shopsRes.json();

        const shopsWithProducts = await Promise.all((shopsData || []).map(async (shop) => {
          const productsRes = await secureLocalFetch(`${API_URL}/products/by-shop/${shop.shop_id}`);
          const productsData = await productsRes.json();
          return { ...shop, products: productsData || [] };
        }));

        return { ...market, shops: shopsWithProducts };
      });

      const collectedMarkets = await Promise.all(detailPromises);
      setMarkets(collectedMarkets);
    } catch (err) {
      console.error(err);
      setError('โหลดข้อมูลตลาดและร้านค้าไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const resetMessages = () => {
    setError('');
    setMessage('');
  };

  const handleProductEdit = (product, shop) => {
    resetMessages();
    setEditingProduct({ ...product, shop_name: shop.shop_name });
    setEditingShop(null);
    setProductForm({
      name: product.name || '',
      price: product.price ?? '',
      description: product.description || '',
      image_url: product.image_url || '',
      is_available: Boolean(product.is_available),
    });
  };

  const handleShopEdit = (shop) => {
    resetMessages();
    setEditingShop(shop);
    setEditingProduct(null);
    setShopForm({
      shop_name: shop.shop_name || '',
      description: shop.description || '',
      phone_number: shop.phone_number || '',
      location: shop.location || '',
      market_id: shop.market_id ? String(shop.market_id) : '',
      status: shop.status || 'Open',
      image_url: shop.image_url || '',
    });
  };

  const handleProductSave = async (event) => {
    event.preventDefault();
    if (!editingProduct) return;

    setSaving(true);
    resetMessages();

    try {
      const payload = buildProductPayload(productForm);
      const token = localStorage.getItem('token');
      const response = await secureLocalFetch(`${API_URL}/products/update/${editingProduct.product_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'แก้ไขสินค้าไม่สำเร็จ');
      setMessage('แก้ไขสินค้าสำเร็จ');
      setEditingProduct(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'แก้ไขสินค้าไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleShopSave = async (event) => {
    event.preventDefault();
    if (!editingShop) return;

    setSaving(true);
    resetMessages();

    try {
      const payload = buildShopPayload(shopForm);
      const token = localStorage.getItem('token');
      const response = await secureLocalFetch(`${API_URL}/admin/shops/${editingShop.shop_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'แก้ไขร้านค้าไม่สำเร็จ');
      setMessage('แก้ไขร้านค้าสำเร็จ');
      setEditingShop(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'แก้ไขร้านค้าไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const promptDeleteProduct = (product) => {
    setDeleteTarget({ type: 'product', id: product.product_id, name: product.name, image_url: product.image_url });
  };

  const promptDeleteShop = (shop) => {
    setDeleteTarget({ type: 'shop', id: shop.shop_id, name: shop.shop_name, image_url: shop.image_url });
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    resetMessages();
    try {
      const token = localStorage.getItem('token');
      let url = '';
      let method = 'DELETE';
      if (deleteTarget.type === 'product') {
        url = `${API_URL}/products/${deleteTarget.id}`;
      } else if (deleteTarget.type === 'shop') {
        url = `${API_URL}/admin/shops/${deleteTarget.id}`;
      }

      const response = await secureLocalFetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ลบไม่สำเร็จ');
      setMessage(deleteTarget.type === 'product' ? 'ลบสินค้าสำเร็จ' : 'ลบร้านค้าสำเร็จ');
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'ลบไม่สำเร็จ');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '12px 0', color: '#475569' }}>กำลังโหลดข้อมูลตลาดและร้านค้า...</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>จัดการตลาด / ร้านค้า / สินค้า</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>แก้ไขข้อมูลร้านค้าและสินค้าภายในตลาดได้จากหน้านี้ โดยลบหรือแก้ไขแบบเรียลไทม์</p>
      </div>

      {message && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: 14 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: '#fff7ed', color: '#9a2c00', border: '1px solid #fed7aa', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaTriangleExclamation /> {error}
        </div>
      )}

      {editingProduct && (
        <form onSubmit={handleProductSave} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>แก้ไขสินค้า</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{editingProduct.shop_name || 'ร้านค้า'}</p>
            </div>
            <button type="button" onClick={() => setEditingProduct(null)} style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer' }}>ยกเลิก</button>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>ชื่อสินค้า</label>
            <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>ราคา</label>
              <input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>สถานะ</label>
              <select value={productForm.is_available ? '1' : '0'} onChange={(e) => setProductForm({ ...productForm, is_available: e.target.value === '1' })} style={inputStyle}>
                <option value="1">พร้อมขาย</option>
                <option value="0">ไม่พร้อมขาย</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>คำอธิบาย</label>
            <textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>ลิงก์รูปภาพ</label>
            <input value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} style={inputStyle} />
          </div>
          <button type="submit" disabled={saving} style={{ alignSelf: 'flex-start', border: 'none', borderRadius: 10, padding: '10px 14px', background: '#4b8ff4', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}
          </button>
        </form>
      )}

      {editingShop && (
        <form onSubmit={handleShopSave} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>แก้ไขร้านค้า</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{editingShop.shop_name}</p>
            </div>
            <button type="button" onClick={() => setEditingShop(null)} style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer' }}>ยกเลิก</button>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>ชื่อร้าน</label>
            <input value={shopForm.shop_name} onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>เบอร์โทร</label>
              <input value={shopForm.phone_number} onChange={(e) => setShopForm({ ...shopForm, phone_number: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>สถานะ</label>
              <select value={shopForm.status} onChange={(e) => setShopForm({ ...shopForm, status: e.target.value })} style={inputStyle}>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>ตลาดน้ำ</label>
            <select value={shopForm.market_id} onChange={(e) => setShopForm({ ...shopForm, market_id: e.target.value })} style={inputStyle}>
              <option value="">-- เลือกตลาดน้ำ --</option>
              {markets.map((market) => (
                <option key={market.market_id} value={market.market_id}>{market.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>ตำแหน่ง/ที่ตั้ง</label>
            <input value={shopForm.location} onChange={(e) => setShopForm({ ...shopForm, location: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>คำอธิบาย</label>
            <textarea value={shopForm.description} onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })} style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>ลิงก์รูปภาพ</label>
            <input value={shopForm.image_url} onChange={(e) => setShopForm({ ...shopForm, image_url: e.target.value })} style={inputStyle} />
          </div>
          <button type="submit" disabled={saving} style={{ alignSelf: 'flex-start', border: 'none', borderRadius: 10, padding: '10px 14px', background: '#4b8ff4', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกร้านค้า'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {markets.map((market) => (
          <div key={market.market_id} style={{ border: '1px solid #e2e8f0', borderRadius: 18, background: '#fff', overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}><FaStore /> {market.name}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
              {(market.shops || []).length === 0 && <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>ยังไม่มีร้านค้าในตลาดนี้</p>}

              {(market.shops || []).map((shop) => (
                <div key={shop.shop_id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', background: '#fcfdff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {shop.image_url ? (
                          <img src={shop.image_url} alt={shop.shop_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: 12, padding: 6 }}>ไม่มีรูป</div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{shop.shop_name || 'ร้านค้า'}</div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>สถานะ: {shop.status || 'Open'} • {shop.phone_number || '—'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleShopEdit(shop)} style={{ border: 'none', background: '#eef2ff', color: '#4338ca', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FaPen size={12} /> แก้ไข</button>
                      <button onClick={() => promptDeleteShop(shop)} style={{ border: 'none', background: '#fef2f2', color: '#dc2626', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FaTrash size={12} /> ลบ</button>
                    </div>
                  </div>

                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(shop.products || []).length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>ยังไม่มีสินค้าในร้านนี้</div>}
                    {(shop.products || []).map((product) => (
                      <div key={product.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: '#fff', border: '1px solid #eef2ff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ color: '#94a3b8', fontSize: 12, padding: 6 }}>ไม่มีรูป</div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{product.name}</div>
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>ราคา {Number(product.price || 0).toLocaleString()} บาท • {product.is_available ? 'พร้อมขาย' : 'ไม่พร้อมขาย'}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleProductEdit(product, shop)} style={{ border: 'none', background: '#eef2ff', color: '#4338ca', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FaPen size={12} /> แก้ไข</button>
                          <button onClick={() => promptDeleteProduct(product)} style={{ border: 'none', background: '#fef2f2', color: '#dc2626', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FaTrash size={12} /> ลบ</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ width: 480, maxWidth: '94%', background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 30px 80px rgba(2,6,23,0.4)' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 120, height: 90, flexShrink: 0, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {deleteTarget.image_url ? (
                  <img src={deleteTarget.image_url} alt={deleteTarget.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: 12, padding: 8 }}>ไม่มีรูปภาพ</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>{deleteTarget.type === 'product' ? 'ลบสินค้า' : 'ลบร้านค้า'}</h3>
                <div style={{ marginTop: 6, color: '#64748b' }}>{deleteTarget.name}</div>
                <p style={{ marginTop: 12, color: '#9a2c00' }}>การกระทำนี้จะลบข้อมูลออกจากฐานข้อมูลอย่างถาวรและไม่สามารถย้อนกลับได้ โปรดยืนยันการลบ</p>
                <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setDeleteTarget(null)} style={{ border: 'none', background: '#f1f5f9', color: '#475569', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>ยกเลิก</button>
                  <button onClick={performDelete} style={{ border: 'none', background: '#dc2626', color: '#fff', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>ยืนยันลบ</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketManagement;
