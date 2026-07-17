// ============================================================
// AddShopForm.jsx — ฟอร์มเพิ่มร้านค้าใหม่
//
// หน้าที่: ให้ผู้ประกอบการกรอกข้อมูลร้านค้าและส่งขออนุมัติ
//
// ฟิลด์: ชื่อร้าน, ประเภท, ตลาดที่สังกัด, เวลาเปิดปิด, เบอร์โทร, รูป
// หลังส่ง: POST /add-entrepreneur → admin รออนุมัติ → สถานะ Pending
//
// เส้นทาง: /addshop (ต้องล็อกอิน)
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
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

const fieldWrap = { marginBottom: 18 };

const star = <span style={{ color: '#8d4d11' }}>*</span>;

function SectionHeader({ tag, title }) {
  return (
    <div style={{ marginBottom: 20, marginTop: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b8ff4' }}>
        {tag}
      </span>
      <h3 style={{ margin: '4px 0 10px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>{title}</h3>
      <div style={{ height: 1, background: '#e2e8f0' }} />
    </div>
  );
}

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

function FocusSelect({ style, children, ...props }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <select
      {...props}
      style={{ ...inputStyle, ...style, borderColor: focused ? '#4b8ff4' : '#e2e8f0' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
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

function Addmarket() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    shop_name: '',
    shop_number: '',
    category: [''],
    phone_number: '',
    phone_number2: '',
    description: '',
    open_time: '',
    close_time: '',
    location: '',
    full_name: '',
    id_card_number: '',
    bank_account_no: '',
    bank_name: '',
    is_verified: '0',
    market_id: '',
  });

  const [markets,         setMarkets]         = useState([]);
  const [validated,       setValidated]       = useState(false);
  const [imgMode,         setImgMode]         = useState('url');
  const [imgPreview,      setImgPreview]      = useState('');
  const [imgUploading,    setImgUploading]    = useState(false);
  const [imageUrl,        setImageUrl]        = useState('');

  const inputRefs = useRef([]);

  const compressImage = (file, maxWidth = 1280, quality = 0.82) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = e => {
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

  const handleImgFile = async (file) => {
    setImgUploading(true);
    try {
      const compressed = await compressImage(file);
      setImgPreview(compressed);
      const res = await secureLocalFetch(`${API_URL}/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ image: compressed, prefix: 'shop' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.url) throw new Error(data.error || 'Upload failed');
      setImageUrl(data.url);
      setImgPreview(data.url);
    } catch (err) { alert('อัปโหลดรูปไม่สำเร็จ: ' + (err.message || err)); }
    finally { setImgUploading(false); }
  };

  useEffect(() => {
    secureLocalFetch(`${API_URL}/floating-markets/all`)
      .then(res => res.json())
      .then(data => setMarkets(data))
      .catch(err => console.error('โหลดตลาดน้ำล้มเหลว', err));
  }, []);

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) nextInput.focus();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value === undefined || value === null ? '' : value });
  };

  const handleCategoryChange = (index, value) => {
    const updatedCategories = [...formData.category];
    updatedCategories[index] = value;
    setFormData({ ...formData, category: updatedCategories });
  };

  const addCategoryField = () => {
    if (formData.category.length < 3) {
      setFormData({ ...formData, category: [...formData.category, ''] });
    }
  };

  const handleSubmit = async (event) => {
    const form = event.currentTarget;
    event.preventDefault();
    if (form.checkValidity() === false) {
      event.stopPropagation();
      setValidated(true);
      // scroll to first invalid field and show alert
      const firstInvalid = form.querySelector(':invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }
      alert('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่องที่มีเครื่องหมาย *');
      return;
    }
    setValidated(true);
    if (imgUploading) { alert('กรุณารอให้อัปโหลดรูปเสร็จก่อนบันทึก'); return; }
    try {
      const res = await secureLocalFetch(`${API_URL}/add-entrepreneur`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ ...formData, market_id: formData.market_id, image_url: imageUrl }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Server returned non-JSON response:', text);
        throw new Error('Server response is not JSON (check backend route URL)');
      }
      if (res.ok) {
        alert('ลงทะเบียนร้านค้าสำเร็จ! รอการอนุมัติจากแอดมิน');
        setFormData({
          shop_name: '',
          shop_number: '',
          category: [''],
          phone_number: '',
          phone_number2: '',
          description: '',
          open_time: '',
          close_time: '',
          location: '',
          full_name: '',
          id_card_number: '',
          bank_account_no: '',
          bank_name: '',
          is_verified: '0',
          market_id: '',
        });
        setValidated(false);
        navigate('/profile');
      } else {
        alert('ไม่สำเร็จ: ' + (data.error || data.message || 'ข้อผิดพลาดจากเซิร์ฟเวอร์'));
      }
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

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
                background: location.pathname === item.path ? '#edf3ff' : 'none',
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
      <main className="rsp-main" style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          ← ย้อนกลับ
        </button>
        {/* Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg,#0a1628,#1a3a6e)',
          color: '#fff',
          borderRadius: 20,
          padding: 28,
          marginBottom: 24,
        }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800 }}>เพิ่มข้อมูลร้านค้า</h1>
          <p style={{ margin: 0, opacity: 0.8, fontSize: 14 }}>กรุณากรอกข้อมูลร้านค้าของคุณอย่างครบถ้วน เพื่อรอการอนุมัติจากแอดมิน</p>
        </div>

        {/* Form Card */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          border: '1px solid #f1f5f9',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          padding: '28px 32px',
        }}>
          <form noValidate validated={validated} onSubmit={handleSubmit}>

            {/* Section 1: Shop Info */}
            <SectionHeader tag="ส่วนที่ 1" title="ข้อมูลร้านค้า" />

            <div style={fieldWrap}>
              <label style={labelStyle}>เลือกตลาดน้ำ {star}</label>
              <FocusSelect name="market_id" value={formData.market_id} onChange={handleChange} required ref={el => (inputRefs.current[13] = el)}>
                <option value="">-- เลือกตลาดน้ำ --</option>
                {markets.map(market => (
                  <option key={market.market_id} value={market.market_id}>{market.name}</option>
                ))}
              </FocusSelect>
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>ชื่อร้านค้า {star}</label>
              <FocusInput
                type="text" name="shop_name" value={formData.shop_name} onChange={handleChange}
                placeholder="เช่น ร้านอาหารเจ ลงลัย" required
                ref={el => (inputRefs.current[0] = el)} onKeyDown={e => handleKeyDown(e, 0)}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>เลขห้องค้า / แผงค้า</label>
              <FocusInput
                type="text" name="shop_number" value={formData.shop_number} onChange={handleChange}
                placeholder="เช่น A-01 หรือ 05"
                ref={el => (inputRefs.current[1] = el)} onKeyDown={e => handleKeyDown(e, 1)}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>ประเภทการค้า {star}</label>
              {formData.category.map((cat, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <FocusSelect value={cat} onChange={e => handleCategoryChange(index, e.target.value)} required={index === 0} style={{ flex: 1 }}>
                    <option value="">-- เลือกประเภท --</option>
                    <option value="food">อาหาร</option>
                    <option value="cloth">เสื้อผ้า</option>
                    <option value="craft">เครื่องดื่ม</option>
                    <option value="antique">ของใช้</option>
                    <option value="service">บริการ</option>
                    <option value="other">อื่นๆ</option>
                  </FocusSelect>
                  {index === formData.category.length - 1 && formData.category.length < 3 && (
                    <button
                      type="button"
                      onClick={addCategoryField}
                      style={{
                        width: 42, height: 46, borderRadius: 10, border: '1.5px solid #e2e8f0',
                        background: '#f8fafc', cursor: 'pointer', fontSize: 18, fontWeight: 700,
                        color: '#4b8ff4', flexShrink: 0,
                      }}
                    >+</button>
                  )}
                </div>
              ))}
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>เบอร์โทรศัพท์ {star}</label>
              <FocusInput
                type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange}
                placeholder="เช่น 08X-XXX-XXXX" required
                ref={el => (inputRefs.current[3] = el)} onKeyDown={e => handleKeyDown(e, 3)}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>เบอร์โทรศัพท์สำรอง</label>
              <FocusInput
                type="tel" name="phone_number2" value={formData.phone_number2} onChange={handleChange}
                placeholder="(ถ้ามี) เช่น 08X-XXX-XXXX"
                ref={el => (inputRefs.current[12] = el)} onKeyDown={e => handleKeyDown(e, 12)}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>สถานที่ตั้ง {star}</label>
              <FocusTextarea
                name="location" value={formData.location} onChange={handleChange}
                placeholder="เช่น ตลาดน้ำแสมสาร บ้านหม้อ อำเภอปากเกต จังหวัดสตูล" required
                ref={el => (inputRefs.current[4] = el)}
              />
            </div>

            <div className="rsp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>เวลาเปิด {star}</label>
                <FocusInput
                  type="time" name="open_time" value={formData.open_time} onChange={handleChange} required
                  ref={el => (inputRefs.current[5] = el)} onKeyDown={e => handleKeyDown(e, 5)}
                />
              </div>
              <div>
                <label style={labelStyle}>เวลาปิด {star}</label>
                <FocusInput
                  type="time" name="close_time" value={formData.close_time} onChange={handleChange} required
                  ref={el => (inputRefs.current[6] = el)} onKeyDown={e => handleKeyDown(e, 6)}
                />
              </div>
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>รายละเอียดเพิ่มเติม</label>
              <FocusTextarea
                name="description" value={formData.description} onChange={handleChange}
                placeholder="อธิบายเพิ่มเติมเกี่ยวกับร้านค้าของคุณ"
                ref={el => (inputRefs.current[7] = el)}
              />
            </div>

            {/* รูปภาพร้านค้า */}
            <div style={fieldWrap}>
              <label style={labelStyle}>รูปภาพร้านค้า</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {['url', 'file'].map(m => (
                  <button key={m} type="button" onClick={() => setImgMode(m)} style={{
                    padding: '5px 14px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                    borderColor: imgMode === m ? '#4b8ff4' : '#e2e8f0',
                    background:  imgMode === m ? '#ede9fe' : '#fff',
                    color:       imgMode === m ? '#4b8ff4' : '#64748b',
                  }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                      {m === 'url' ? <FaLink /> : <FaUpload />}
                      {m === 'url' ? 'ลิงก์ URL' : 'อัปโหลดจากเครื่อง'}
                    </span>
                  </button>
                ))}
              </div>

              {imgMode === 'url' ? (
                <input
                  type="text" placeholder="https://..."
                  value={imageUrl}
                  onChange={e => { setImageUrl(e.target.value); setImgPreview(e.target.value); }}
                  style={{ ...inputStyle, borderColor: '#e2e8f0' }}
                />
              ) : (
                <div>
                  <input type="file" accept="image/*"
                    onChange={e => { if (e.target.files[0]) handleImgFile(e.target.files[0]); }}
                    style={{ fontSize: 13 }} />
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    {imgUploading ? '⏳ กำลังอัปโหลด...' : 'รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 15MB'}
                  </p>
                </div>
              )}

              {imgPreview && (
                <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
                  <img src={imgPreview} alt="preview"
                    onError={e => { e.target.style.display = 'none'; }}
                    style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0', display: 'block' }} />
                  <button type="button"
                    onClick={() => { setImgPreview(''); setImageUrl(''); }}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#8d4d11', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaXmark /></button>
                </div>
              )}
            </div>

            {/* Section 2: Owner Info */}
            <SectionHeader tag="ส่วนที่ 2" title="ข้อมูลเจ้าของร้าน" />

            <div style={fieldWrap}>
              <label style={labelStyle}>ชื่อ-นามสกุลจริง {star}</label>
              <FocusInput
                type="text" name="full_name" value={formData.full_name} onChange={handleChange}
                placeholder="เช่น นางสาว ลงลัย สายจันทร์" required
                ref={el => (inputRefs.current[8] = el)} onKeyDown={e => handleKeyDown(e, 8)}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>เลขบัตรประชาชน {star}</label>
              <FocusInput
                type="text" name="id_card_number" value={formData.id_card_number || ''} onChange={handleChange}
                placeholder="เช่น X-XXXX-XXXXX-XX-X" required
                ref={el => (inputRefs.current[9] = el)} onKeyDown={e => handleKeyDown(e, 9)}
              />
            </div>

            {/* Section 3: Bank Info */}
            <SectionHeader tag="ส่วนที่ 3" title="ข้อมูลบัญชีธนาคาร" />

            <div style={fieldWrap}>
              <label style={labelStyle}>ชื่อธนาคาร {star}</label>
              <FocusSelect name="bank_name" value={formData.bank_name} onChange={handleChange} required ref={el => (inputRefs.current[10] = el)}>
                <option value="">-- เลือกธนาคาร --</option>
                <option value="Bangkok Bank">ธนาคารกรุงเทพ</option>
                <option value="Kasikornbank">ธนาคารกสิกรไทย</option>
                <option value="Krung Thai Bank">ธนาคารกรุงไทย</option>
                <option value="TTB">ธนาคารทหารไทย</option>
                <option value="Siam Commercial">ธนาคารสยามพาณิชย์</option>
                <option value="Citibank">ธนาคารซิตี้แบงก์</option>
                <option value="KBANK">ธนาคารเคบี</option>
                <option value="Other">อื่นๆ</option>
              </FocusSelect>
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>เลขที่บัญชีธนาคาร {star}</label>
              <FocusInput
                type="text" name="bank_account_no" value={formData.bank_account_no} onChange={handleChange}
                placeholder="เช่น X-XXX-XXXXX-X" required
                ref={el => (inputRefs.current[11] = el)} onKeyDown={e => handleKeyDown(e, 11)}
              />
            </div>

            {/* Section 4: Status */}
            <SectionHeader tag="ส่วนที่ 4" title="สถานะ" />

            <div style={{ marginBottom: 28 }}>
              <div style={{
                padding: '14px 18px',
                background: '#fffbeb',
                border: '1.5px solid #e8b895',
                borderRadius: 10,
                fontSize: 14,
                color: '#5c2c08',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>⏳</span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>ยังไม่อนุมัติ (รอการตรวจสอบจากแอดมิน)</div>
                  <div style={{ fontSize: 12, color: '#5c2c08', marginTop: 2 }}>แอดมินจะตรวจสอบและอนุมัติข้อมูลของคุณในภายหลัง</div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={imgUploading}
              style={{
                background: imgUploading ? '#94a3b8' : 'linear-gradient(135deg,#4b8ff4,#4b8ff4)',
                color: '#fff',
                borderRadius: 12,
                padding: 14,
                fontWeight: 700,
                fontSize: 15,
                width: '100%',
                border: 'none',
                cursor: imgUploading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                letterSpacing: 0.3,
              }}
            >
              {imgUploading ? '⏳ กำลังอัปโหลดรูป รอสักครู่...' : 'บันทึกข้อมูลร้านค้า'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Addmarket;
