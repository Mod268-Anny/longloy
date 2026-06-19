import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
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

function EditProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const { product_id } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // ✅ State สำหรับฟอร์มแก้ไขสินค้า
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    is_available: 1
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ✅ โหลดข้อมูลสินค้า
  useEffect(() => {
    if (!product_id) {
      setError('ไม่พบ product_id');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/');
      return;
    }

    // ดึงข้อมูลสินค้า (using GET /products/by-shop/:shop_id ที่ได้มาจากหน้าก่อน)
    // หรือหา product_id ในตาราง products โดยตรง
    setLoading(false);
    // สำหรับตอนนี้ ให้ form ว่างไป และผู้ใช้กรอกข้อมูลที่ต้องแก้ไข
  }, [product_id, navigate]);

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
    if (formData.price && (isNaN(formData.price) || formData.price <= 0)) {
      setError('ราคาต้องเป็นตัวเลขและมากกว่า 0');
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // ✅ ส่งข้อมูลไปยัง API
      const response = await secureLocalFetch(`${API_URL}/edit-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: parseInt(product_id),
          name: formData.name || undefined,
          price: formData.price ? parseFloat(formData.price) : undefined,
          is_available: formData.is_available !== undefined ? formData.is_available : undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('แก้ไขสินค้าสำเร็จแล้ว!');
        // Redirect ไปหน้าจัดการสินค้า
        setTimeout(() => {
          navigate('/shop-products');
        }, 1500);
      } else {
        setError(data.error || 'แก้ไขสินค้าไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('เกิดข้อผิดพลาดในการแก้ไขสินค้า');
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
          <span style={{ fontSize: '36px', lineHeight: 1 }}>✏️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.3px' }}>
              แก้ไขสินค้า
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.8 }}>
              รหัสสินค้า: <strong style={{ opacity: 1 }}>{product_id}</strong>
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
                ชื่อสินค้า <span style={{ color: '#94a3b8', fontWeight: 400 }}>(ไม่บังคับ)</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="ชื่อสินค้า"
                style={{
                  ...inputStyle,
                  borderColor: focusedField === 'name' ? '#4b8ff4' : '#e2e8f0',
                }}
              />
            </div>

            {/* ราคา */}
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>
                ราคา (บาท) <span style={{ color: '#94a3b8', fontWeight: 400 }}>(ไม่บังคับ)</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                onFocus={() => setFocusedField('price')}
                onBlur={() => setFocusedField(null)}
                placeholder="ราคา"
                step="0.01"
                min="0"
                style={{
                  ...inputStyle,
                  borderColor: focusedField === 'price' ? '#4b8ff4' : '#e2e8f0',
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
                {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
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

export default EditProduct;
