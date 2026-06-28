// ============================================================
// AddProduct.jsx — ฟอร์มเพิ่มสินค้าใหม่ (standalone page)
//
// หน้าที่: ให้ผู้ประกอบการกรอกข้อมูลสินค้าใหม่และบันทึก
//
// หมายเหตุ: ฟีเจอร์นี้มีในแท็บ "สินค้า" ของ EntrepreneurDashboard.jsx แล้ว
//           ไฟล์นี้เป็น standalone page กรณีต้องการเปิดหน้าแยก
//
// ฟิลด์: ชื่อ, ราคา, หน่วย, คำอธิบาย, รูปภาพ, ขนาด, สถานะ
// API: POST /products/add
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBasketShopping } from 'react-icons/fa6';
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
  borderRadius: '10px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#475569',
  display: 'block',
  marginBottom: '6px',
};

function AddProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const [focusedField, setFocusedField] = useState(null);

  const [user, setUser] = useState(null);
  const [entrepreneur, setEntrepreneur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ✅ State สำหรับฟอร์มเพิ่มสินค้า
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    image_url: '',
    category: '',
    stock: '',
    is_available: 1
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ✅ ตรวจสอบสิทธิ์และโหลดข้อมูล
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/');
      return;
    }

    // ดึงข้อมูล user
    secureLocalFetch(`${API_URL}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setUser(data.user);

        // ดึงข้อมูลผู้ประกอบการ
        if (data.user?.user_id) {
          return secureLocalFetch(`${API_URL}/entrepreneur/${data.user.user_id}`);
        } else {
          throw new Error('ไม่พบข้อมูลผู้ใช้');
        }
      })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error('ไม่พบข้อมูลผู้ประกอบการ');
        }
      })
      .then(data => {
        // ตรวจสอบว่าผู้ประกอบการได้รับการอนุมัติหรือไม่
        if (data?.is_verified !== 1) {
          setError('คุณต้องได้รับการอนุมัติจากแอดมินก่อนจึงจะสามารถเพิ่มสินค้าได้');
          setTimeout(() => navigate('/profile'), 3000);
        }
        setEntrepreneur(data);
      })
      .catch(err => {
        console.error('Error:', err);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        setTimeout(() => navigate('/profile'), 3000);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // ✅ จัดการการเปลี่ยนแปลง input
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    });
  };

  // ✅ จัดการการส่งฟอร์ม
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    // ✅ ตรวจสอบข้อมูล
    if (!formData.name || !formData.price || !formData.description) {
      setError('กรุณากรอกข้อมูลที่จำเป็น (ชื่อ, ราคา, รายละเอียด)');
      setSubmitting(false);
      return;
    }

    if (isNaN(formData.price) || formData.price <= 0) {
      setError('ราคาต้องเป็นตัวเลขและมากกว่า 0');
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // ✅ ส่งข้อมูลไปยัง API
      const response = await secureLocalFetch(`${API_URL}/products/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          shop_id: entrepreneur?.shop_id || entrepreneur?.entrepreneurs_id,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock) || 0
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('เพิ่มสินค้าสำเร็จแล้ว!');
        // รีเซ็ตฟอร์ม
        setFormData({
          name: '',
          price: '',
          description: '',
          image_url: '',
          category: '',
          stock: '',
          is_available: 1
        });
        // Redirect ไปหน้าจัดการสินค้า
        setTimeout(() => {
          navigate('/shop-products');
        }, 1500);
      } else {
        setError(data.error || 'เพิ่มสินค้าไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('เกิดข้อผิดพลาดในการเพิ่มสินค้า');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #4b8ff4',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && !entrepreneur) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '24px',
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          border: '1px solid #f1f5f9',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          padding: '40px 32px',
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <p style={{ color: '#475569', fontSize: '15px', marginBottom: '24px', lineHeight: 1.6 }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/profile')}
            style={{
              background: 'linear-gradient(135deg,#4b8ff4,#4b8ff4)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '13px 20px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            กลับไปหน้า Profile
          </button>
        </div>
      </div>
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Sticky Navbar ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid #f1f5f9',
        gap: '24px',
      }}>
        <img
          src="/logo-longloy.png"
          alt="LongLoy"
          className="rsp-logo"
          style={{ height: 45, cursor: 'pointer', flexShrink: 0 }}
          onClick={() => navigate('/homepage')}
        />

        <nav style={{ display: 'flex', gap: '4px', flex: 1 }}>
          {NAV.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: active ? '#edf3ff' : 'transparent',
                  color: active ? '#4b8ff4' : '#64748b',
                  fontWeight: active ? 700 : 500,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                {item.icon}
                <span className="rsp-nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button style={iconBtnStyle} onClick={() => navigate('/cart')} title="ตะกร้า">
            <i className="fas fa-basket-shopping" style={{ fontSize: 17 }} />
          </button>
          <button style={iconBtnStyle} onClick={() => navigate('/profile')} title="โปรไฟล์">
            <i className="fas fa-user-circle" style={{ fontSize: 18 }} />
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="rsp-main" style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          ← ย้อนกลับ
        </button>

        {/* Hero banner */}
        <div style={{
          background: 'linear-gradient(135deg,#0a1628,#1a3a6e)',
          borderRadius: '20px',
          padding: '28px 32px',
          marginBottom: '24px',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <span style={{ fontSize: '36px', lineHeight: 1 }}>🛍️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.3px' }}>
              เพิ่มสินค้า
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.8 }}>
              เพิ่มสินค้าใหม่ให้กับร้าน{' '}
              <strong style={{ opacity: 1 }}>{entrepreneur?.shop_name}</strong>
            </p>
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div style={{
            padding: '14px 18px',
            background: '#fff0e8',
            color: '#5c2c08',
            border: '1px solid #ffe8d4',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* Success alert */}
        {success && (
          <div style={{
            padding: '14px 18px',
            background: '#edf3ff',
            color: '#1a3a6e',
            border: '1px solid #b8d4fb',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '14px',
          }}>
            {success}
          </div>
        )}

        {/* Form card */}
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          border: '1px solid #f1f5f9',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          padding: '28px 32px',
        }}>
          <form onSubmit={handleSubmit}>

            {/* ชื่อสินค้า */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>
                ชื่อสินค้า <span style={{ color: '#8d4d11' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="เช่น กาแฟเมล็ดแท้"
                style={{
                  ...inputStyle,
                  borderColor: focusedField === 'name' ? '#4b8ff4' : '#e2e8f0',
                }}
                required
              />
            </div>

            {/* ราคา */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>
                ราคา (บาท) <span style={{ color: '#8d4d11' }}>*</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                onFocus={() => setFocusedField('price')}
                onBlur={() => setFocusedField(null)}
                placeholder="เช่น 150"
                step="0.01"
                min="0"
                style={{
                  ...inputStyle,
                  borderColor: focusedField === 'price' ? '#4b8ff4' : '#e2e8f0',
                }}
                required
              />
            </div>

            {/* รายละเอียด */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>
                รายละเอียด <span style={{ color: '#8d4d11' }}>*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                onFocus={() => setFocusedField('description')}
                onBlur={() => setFocusedField(null)}
                placeholder="อธิบายเกี่ยวกับสินค้า..."
                style={{
                  ...inputStyle,
                  minHeight: '110px',
                  resize: 'vertical',
                  borderColor: focusedField === 'description' ? '#4b8ff4' : '#e2e8f0',
                }}
                required
              />
            </div>

            {/* URL รูปภาพ */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>URL รูปภาพ</label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                onFocus={() => setFocusedField('image_url')}
                onBlur={() => setFocusedField(null)}
                placeholder="https://..."
                style={{
                  ...inputStyle,
                  borderColor: focusedField === 'image_url' ? '#4b8ff4' : '#e2e8f0',
                }}
              />
            </div>

            {/* หมวดหมู่ */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>หมวดหมู่</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                onFocus={() => setFocusedField('category')}
                onBlur={() => setFocusedField(null)}
                placeholder="เช่น เครื่องดื่ม"
                style={{
                  ...inputStyle,
                  borderColor: focusedField === 'category' ? '#4b8ff4' : '#e2e8f0',
                }}
              />
            </div>

            {/* จำนวนสินค้า */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>จำนวนสินค้า</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                onFocus={() => setFocusedField('stock')}
                onBlur={() => setFocusedField(null)}
                placeholder="0"
                min="0"
                style={{
                  ...inputStyle,
                  borderColor: focusedField === 'stock' ? '#4b8ff4' : '#e2e8f0',
                }}
              />
            </div>

            {/* สินค้าพร้อมขาย */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                color: '#475569',
              }}>
                <input
                  type="checkbox"
                  name="is_available"
                  checked={formData.is_available === 1}
                  onChange={handleChange}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4b8ff4' }}
                />
                สินค้าพร้อมขาย
              </label>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 1,
                  background: submitting
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg,#4b8ff4,#4b8ff4)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '13px 20px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'opacity 0.2s',
                }}
              >
                {submitting ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/shop-products')}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '13px 20px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ยกเลิก
              </button>
            </div>

          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AddProduct;
