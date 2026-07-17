// ============================================================
// EditShop.jsx — ฟอร์มแก้ไขข้อมูลร้านค้า
//
// หน้าที่: โหลดข้อมูลร้านปัจจุบันและให้แก้ไขได้
//
// รับ query: ?shop_id=xxx
// ฟิลด์: ชื่อร้าน, ประเภท, เวลาเปิดปิด, เบอร์โทร, รูปร้าน
// หลังบันทึก: PUT /my-shop → navigate กลับ EntrepreneurDashboard
//
// เส้นทาง: /editshop?shop_id=xxx (ต้องล็อกอิน + เจ้าของร้าน)
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBasketShopping, FaLink, FaUpload, FaXmark } from 'react-icons/fa6';
import { FaUserCircle } from 'react-icons/fa';
import { MdHome, MdStorefront, MdOutlineSportsEsports, MdHelpOutline } from 'react-icons/md';
import API_URL, { secureLocalFetch } from './config';
import Footer from './Footer';

const NAV = [
  { label: 'หน้าแรก', icon: <MdHome size={18} />, path: '/homepage' },
  { label: 'ตลาดน้ำ', icon: <MdStorefront size={18} />, path: '/market' },
  { label: 'เกม', icon: <MdOutlineSportsEsports size={18} />, path: '/game' },
  { label: 'ช่วยเหลือ', icon: <MdHelpOutline size={18} />, path: '/help' },
];

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: '#fff',
  color: '#1e293b',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: '#475569',
  display: 'block',
  marginBottom: 6,
};

function FocusInput({ style, ...props }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      {...props}
      className="rsp-input"
      style={{ ...inputStyle, ...style, borderColor: focused ? '#4b8ff4' : '#e2e8f0' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function FocusTextarea({ style, ...props }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, ...style, resize: 'vertical', minHeight: 80, borderColor: focused ? '#4b8ff4' : '#e2e8f0' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

const iconBtnStyle = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#64748b',
  flexShrink: 0,
};

const cardStyle = {
  background: '#fff',
  borderRadius: 20,
  border: '1px solid #f1f5f9',
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  padding: '28px 32px',
};

const token = () => localStorage.getItem('token') || '';
const authH = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

function compressImage(file, maxWidth = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadBase64(base64, prefix = 'img') {
  const res = await fetch(`${API_URL}/upload-image`, {
    method: 'POST',
    headers: authH(),
    body: JSON.stringify({ image: base64, prefix }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data.url) throw new Error(data.error || 'Upload failed');
  return data.url;
}

export default function EditShop() {
  const navigate = useNavigate();
  const location = useLocation();
  const shopIdFromUrl = new URLSearchParams(location.search).get('shop_id');

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;
  const [productsLoading, setProductsLoading] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editProductFields, setEditProductFields] = useState({ name: '', price: '', description: '', image_url: '' });

  // shop image upload state
  const [shopImgMode,     setShopImgMode]     = useState('url');   // 'url' | 'file'
  const [shopImgPreview,  setShopImgPreview]  = useState('');
  const [shopImgUploading,setShopImgUploading]= useState(false);

  // product image upload state (inside popup)
  const [prodImgMode,     setProdImgMode]     = useState('url');
  const [prodImgPreview,  setProdImgPreview]  = useState('');
  const [prodImgUploading,setProdImgUploading]= useState(false);

  useEffect(() => {
    const url = shopIdFromUrl ? `${API_URL}/my-shop?shop_id=${shopIdFromUrl}` : `${API_URL}/my-shop`;
    secureLocalFetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      .then(res => res.json())
      .then(data => {
        setShop(data);
        if (data?.image_url) setShopImgPreview(data.image_url);
        setLoading(false);
        if (data?.entrepreneurs_id) {
          setProductsLoading(true);
          secureLocalFetch(`${API_URL}/products/by-entre/${data.entrepreneurs_id}`)
            .then(res => res.json())
            .then(products => setProducts(Array.isArray(products) ? products : []))
            .catch(() => setProducts([]))
            .finally(() => setProductsLoading(false));
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = e => {
    setShop({ ...shop, [e.target.name]: e.target.value });
  };

  const handleShopFile = async (file) => {
    setShopImgUploading(true);
    try {
      const compressed = await compressImage(file);
      setShopImgPreview(compressed);
      const url = await uploadBase64(compressed, 'shop');
      setShop(s => ({ ...s, image_url: url }));
      setShopImgPreview(url);
    } catch (err) { alert('อัปโหลดรูปร้านค้าไม่สำเร็จ: ' + (err.message || err)); }
    finally { setShopImgUploading(false); }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (shopImgUploading) { alert('กรุณารอให้อัปโหลดรูปเสร็จก่อนบันทึก'); return; }
    const res = await secureLocalFetch(`${API_URL}/edit-shop`, {
      method: 'POST',
      headers: authH(),
      body: JSON.stringify(shop),
    });
    if (res.ok) {
      alert('บันทึกข้อมูลร้านค้าสำเร็จ!');
      navigate('/entrepreneur-dashboard');
    } else {
      const errData = await res.json().catch(() => ({}));
      alert(errData.error || 'เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const totalPages = Math.ceil(products.length / productsPerPage);
  const paginatedProducts = products.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);

  const handleToggleSale = async (product_id) => {
    const token = localStorage.getItem('token');
    const product = products.find(p => p.product_id === product_id);
    if (!product) return;
    const newStatus = product.is_available === 1 ? 0 : 1;
    try {
      const res = await secureLocalFetch(`${API_URL}/edit-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: product.product_id, is_available: newStatus }),
      });
      if (res.ok) {
        setProducts(prev => prev.map(p =>
          p.product_id === product_id ? { ...p, is_available: newStatus } : p
        ));
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาดในการอัปเดตสถานะสินค้า');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleEditProduct = (product) => {
    setEditProduct(product);
    setEditProductFields({ name: product.name || '', price: product.price || '', description: product.description || '', image_url: product.image_url || '' });
    setProdImgPreview(product.image_url || '');
    setProdImgMode('url');
  };

  const handleCloseEditProduct = () => { setEditProduct(null); setProdImgPreview(''); };

  const handleEditProductFieldChange = (e) => {
    setEditProductFields(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleProdFile = async (file) => {
    setProdImgUploading(true);
    try {
      const compressed = await compressImage(file);
      setProdImgPreview(compressed);
      const url = await uploadBase64(compressed, 'product');
      setEditProductFields(f => ({ ...f, image_url: url }));
      setProdImgPreview(url);
    } catch (err) { alert('อัปโหลดรูปสินค้าไม่สำเร็จ: ' + (err.message || err)); }
    finally { setProdImgUploading(false); }
  };

  const handleSaveEditProduct = async () => {
    try {
      const updateBody = { product_id: editProduct.product_id };
      if (editProductFields.name !== editProduct.name) updateBody.name = editProductFields.name;
      if (editProductFields.price !== String(editProduct.price)) updateBody.price = editProductFields.price;
      if (editProductFields.image_url !== (editProduct.image_url || '')) updateBody.image_url = editProductFields.image_url;
      const res = await secureLocalFetch(`${API_URL}/edit-product`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify(updateBody),
      });
      if (res.ok) {
        setProducts(prev => prev.map(p =>
          p.product_id === editProduct.product_id
            ? { ...p, name: editProductFields.name, price: editProductFields.price, image_url: editProductFields.image_url }
            : p
        ));
        setEditProduct(null);
        setProdImgPreview('');
        alert('บันทึกข้อมูลสินค้าสำเร็จ!');
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#4b8ff4', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14 }}>กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center', color: '#64748b', fontSize: 16 }}>ไม่พบข้อมูลร้านค้า</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Navbar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid #f1f5f9',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        gap: 32,
      }}>
        <img src="/logo-longloy.png" alt="LongLoy" className="rsp-logo" style={{ height: 45, cursor: 'pointer' }} onClick={() => navigate('/homepage')} />
        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {NAV.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: location.pathname === item.path ? '#f0f4ff' : 'none',
                color: location.pathname === item.path ? '#4b8ff4' : '#64748b',
                fontWeight: location.pathname === item.path ? 600 : 500,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {item.icon} <span className="rsp-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={iconBtnStyle} onClick={() => navigate('/cart')} title="ตะกร้า">
            <i className="fas fa-basket-shopping" style={{ fontSize: 17 }} />
          </button>
          <button style={iconBtnStyle} onClick={() => navigate('/profile')} title="โปรไฟล์">
            <i className="fas fa-user-circle" style={{ fontSize: 18 }} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="rsp-main" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          ← ย้อนกลับ
        </button>

        {/* Edit Shop Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0, color: '#1e293b' }}>แก้ไขข้อมูลร้านค้า</h2>
            <button
              onClick={() => {
                if (shop && shop.shop_id) {
                  navigate(`/shop-orders/${shop.shop_id}`);
                } else {
                  alert('ยังไม่ได้บันทึกข้อมูลร้านค้า');
                }
              }}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg,#4b8ff4,#2d6fd4)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              ดูคำสั่งซื้อ
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>ชื่อร้านค้า</label>
              <FocusInput name="shop_name" value={shop.shop_name || ''} onChange={handleChange} required />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>รายละเอียด</label>
              <FocusTextarea name="description" value={shop.description || ''} onChange={handleChange} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>เบอร์โทรศัพท์</label>
              <FocusInput name="phone_number" value={shop.phone_number || ''} onChange={handleChange} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>สถานที่ตั้ง</label>
              <FocusInput name="location" value={shop.location || ''} onChange={handleChange} />
            </div>

            {/* ── Shop image ── */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>รูปภาพร้านค้า</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {['url', 'file'].map(m => (
                  <button key={m} type="button" onClick={() => setShopImgMode(m)} style={{
                    padding: '5px 14px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                    borderColor: shopImgMode === m ? '#4b8ff4' : '#e2e8f0',
                    background: shopImgMode === m ? '#ede9fe' : '#fff',
                    color: shopImgMode === m ? '#4b8ff4' : '#64748b',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {m === 'url' ? <FaLink /> : <FaUpload />}
                      {m === 'url' ? 'ลิงก์ URL' : 'อัปโหลดจากเครื่อง'}
                    </span>
                  </button>
                ))}
              </div>
              {shopImgMode === 'url' ? (
                <FocusInput
                  name="image_url"
                  value={shop.image_url || ''}
                  onChange={e => { setShop(s => ({ ...s, image_url: e.target.value })); setShopImgPreview(e.target.value); }}
                  placeholder="https://..."
                />
              ) : (
                <div>
                  <input type="file" accept="image/*"
                    onChange={e => { if (e.target.files[0]) handleShopFile(e.target.files[0]); }}
                    style={{ fontSize: 13 }} />
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    {shopImgUploading ? '⏳ กำลังอัปโหลด...' : 'รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 15MB'}
                  </p>
                </div>
              )}
              {shopImgPreview && (
                <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
                  <img src={shopImgPreview.startsWith('/uploads') ? `${API_URL}${shopImgPreview}` : shopImgPreview}
                    alt="shop preview" onError={e => { e.target.style.display = 'none'; }}
                    style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0', display: 'block' }} />
                  <button type="button" onClick={() => { setShopImgPreview(''); setShop(s => ({ ...s, image_url: '' })); }}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#8d4d11', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaXmark /></button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={shopImgUploading}
              style={{
                background: shopImgUploading ? '#94a3b8' : 'linear-gradient(135deg,#4b8ff4,#4b8ff4)',
                color: '#fff',
                borderRadius: 12,
                padding: 14,
                fontWeight: 700,
                fontSize: 15,
                width: '100%',
                border: 'none',
                cursor: shopImgUploading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {shopImgUploading ? '⏳ กำลังอัปโหลดรูป รอสักครู่...' : 'บันทึกข้อมูล'}
            </button>
          </form>
        </div>

        {/* Product List Card */}
        <div style={{ ...cardStyle, marginTop: 24 }}>
          <h3 style={{ fontWeight: 800, fontSize: 20, margin: '0 0 20px', color: '#1e293b' }}>รายการสินค้าในร้าน</h3>

          {productsLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 14 }}>
              กำลังโหลดสินค้า...
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 15 }}>
              ยังไม่มีสินค้าในร้าน
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {paginatedProducts.map(product => (
                  <div
                    key={product.product_id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                      borderRadius: 14,
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    {/* thumbnail */}
                    <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#e2e8f0' }}>
                      {product.image_url ? (
                        <img
                          src={product.image_url.startsWith('/uploads') ? `${API_URL}${product.image_url}` : product.image_url}
                          alt={product.name}
                          onError={e => { e.target.style.display = 'none'; }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}><FaBasketShopping /></div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>{product.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>รหัสสินค้า: {product.product_id}</div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>฿{product.price}</span>
                        <span style={{ fontSize: 13, color: '#475569' }}>คงเหลือ: {product.stock ?? '-'}</span>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: product.is_available === 1 ? '#4b8ff4' : '#8d4d11',
                          background: product.is_available === 1 ? '#d1fae5' : '#ffe8d4',
                          padding: '2px 10px', borderRadius: 20,
                        }}>
                          {product.is_available === 1 ? 'เปิดการขาย' : 'ปิดการขาย'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => handleToggleSale(product.product_id)}
                        title={product.is_available === 1 ? 'คลิกเพื่อปิดการขาย' : 'คลิกเพื่อเปิดการขาย'}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: product.is_available === 1 ? '#ffe8d4' : '#d1fae5',
                          color: product.is_available === 1 ? '#8d4d11' : '#4b8ff4',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {product.is_available === 1 ? 'ปิดการขาย' : 'เปิดการขาย'}
                      </button>
                      <button
                        onClick={() => handleEditProduct(product)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#ede9fe',
                          color: '#4b8ff4',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        แก้ไขเมนู
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      background: 'none', border: 'none', fontSize: 20,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      color: currentPage === 1 ? '#cbd5e1' : '#4b8ff4',
                    }}
                  >&lt;</button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <span
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: currentPage === idx + 1 ? '#4b8ff4' : '#e2e8f0',
                        margin: '0 3px',
                        cursor: 'pointer',
                        border: currentPage === idx + 1 ? '2px solid #4b8ff4' : '2px solid #e2e8f0',
                        transition: 'background 0.2s',
                      }}
                    />
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      background: 'none', border: 'none', fontSize: 20,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      color: currentPage === totalPages ? '#cbd5e1' : '#4b8ff4',
                    }}
                  >&gt;</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Edit Product Popup */}
      {editProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15,23,42,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            padding: '32px',
            minWidth: 340,
            maxWidth: 460,
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h3 style={{ fontWeight: 800, fontSize: 20, margin: '0 0 20px', color: '#1e293b' }}>แก้ไขสินค้า</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>ชื่อสินค้า</label>
              <FocusInput name="name" value={editProductFields.name} onChange={handleEditProductFieldChange} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>ราคา</label>
              <FocusInput name="price" type="number" value={editProductFields.price} onChange={handleEditProductFieldChange} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>รายละเอียด</label>
              <FocusTextarea name="description" value={editProductFields.description} onChange={handleEditProductFieldChange} style={{ minHeight: 60 }} />
            </div>

            {/* ── Product image ── */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>รูปภาพสินค้า</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {['url', 'file'].map(m => (
                  <button key={m} type="button" onClick={() => setProdImgMode(m)} style={{
                    padding: '5px 14px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                    borderColor: prodImgMode === m ? '#4b8ff4' : '#e2e8f0',
                    background: prodImgMode === m ? '#ede9fe' : '#fff',
                    color: prodImgMode === m ? '#4b8ff4' : '#64748b',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {m === 'url' ? <FaLink /> : <FaUpload />}
                      {m === 'url' ? 'ลิงก์ URL' : 'อัปโหลดจากเครื่อง'}
                    </span>
                  </button>
                ))}
              </div>
              {prodImgMode === 'url' ? (
                <FocusInput
                  name="image_url"
                  value={editProductFields.image_url}
                  onChange={e => { handleEditProductFieldChange(e); setProdImgPreview(e.target.value); }}
                  placeholder="https://..."
                />
              ) : (
                <div>
                  <input type="file" accept="image/*"
                    onChange={e => { if (e.target.files[0]) handleProdFile(e.target.files[0]); }}
                    style={{ fontSize: 13 }} />
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    {prodImgUploading ? '⏳ กำลังอัปโหลด...' : 'รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 15MB'}
                  </p>
                </div>
              )}
              {prodImgPreview && (
                <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
                  <img src={prodImgPreview.startsWith('/uploads') ? `${API_URL}${prodImgPreview}` : prodImgPreview}
                    alt="preview" onError={e => { e.target.style.display = 'none'; }}
                    style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0', display: 'block' }} />
                  <button type="button"
                    onClick={() => { setProdImgPreview(''); setEditProductFields(f => ({ ...f, image_url: '' })); }}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#8d4d11', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaXmark /></button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseEditProduct}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >ยกเลิก</button>
              <button
                onClick={handleSaveEditProduct}
                disabled={prodImgUploading}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: prodImgUploading ? '#94a3b8' : 'linear-gradient(135deg,#4b8ff4,#4b8ff4)', color: '#fff',
                  fontWeight: 700, cursor: prodImgUploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}
              >{prodImgUploading ? '⏳ รอสักครู่...' : 'บันทึก'}</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
