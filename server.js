
// ============================================================
// server.js — Backend หลักของแอป LongLoy (Node.js + Express)
//
// ภาพรวมของไฟล์นี้ (ตามลำดับจากบนลงล่าง):
//   1. Setup          — Express, CORS, MySQL pool, Socket.io
//   2. DB Init        — สร้างตาราง + migration ทุกครั้งที่ server เริ่ม
//   3. Auth           — POST /login, POST /register, verifyToken middleware
//   4. Markets        — GET /floating-markets/*
//   5. Shops          — GET/POST /shops/*, /entrepreneur/*
//   6. Reviews        — GET/POST /market-reviews, /shop-reviews, /product-reviews
//   7. Points/Steps   — POST /user/add-points, /user/save-steps, /user/steps
//   8. Cart           — POST /cart/add
//   9. Payment        — POST /orders/checkout, /payments/create-charge (Omise)
//  10. Products       — POST/PUT/DELETE /products/*
//  11. Points API     — GET/POST /user/points, /user/exchange-steps-to-points
//  12. Rewards/Quests — GET/POST /rewards/*, /quests/*
//  13. Admin          — GET/PUT /admin/* (ต้องการ role Admin)
//  14. Quiz/Game      — GET/POST /quiz/*, /game/*
//  15. Socket.io      — realtime notification ออเดอร์ใหม่
// ============================================================

// ── Dependencies ─────────────────────────────────────────────
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const http  = require('http');
const fs   = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { Server } = require('socket.io');

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DIST_DIR = path.join(__dirname, 'dist');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

const hasCloudinaryConfig = () => !!process.env.CLOUDINARY_CLOUD_NAME && !!process.env.CLOUDINARY_API_KEY && !!process.env.CLOUDINARY_API_SECRET;

if (hasCloudinaryConfig()) {
  console.log('✅ Cloudinary configured — uploads will persist across deploys');
} else {
  console.warn('⚠️ CLOUDINARY_* env vars missing — uploads will fall back to local disk and WILL BE LOST on the next deploy/restart');
}

async function uploadImageToStorage(image, prefix = 'img') {
  if (hasCloudinaryConfig()) {
    try {
      const result = await cloudinary.uploader.upload(image, {
        folder: 'longloy',
        public_id: `${prefix}_${Date.now()}`,
        resource_type: 'image',
      });
      return result.secure_url;
    } catch (err) {
      console.error('Cloudinary upload failed:', err.message || err);
    }
  }

  const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid image format');

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const fname = `${prefix}_${Date.now()}.${ext}`;
  const fpath = path.join(UPLOADS_DIR, fname);
  fs.writeFileSync(fpath, Buffer.from(matches[2], 'base64'));
  return `/uploads/${fname}`;
}

const parseDatabaseUrl = (value) => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const dbName = parsed.pathname.replace(/^\//, '');
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: dbName || 'floating_LongLoy',
    };
  } catch (err) {
    console.warn('⚠️ Invalid database URL format:', err.message);
    return null;
  }
};

const getDbConfig = () => {
  const connectionString = process.env.DATABASE_URL || process.env.MYSQL_URL || '';
  const parsedConnection = parseDatabaseUrl(connectionString);

  if (parsedConnection) {
    return {
      ...parsedConnection,
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'floating_LongLoy',
    port: Number(process.env.DB_PORT) || 3306,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
  };
};

const app = express();
// Debug: log every incoming request
app.set('etag', false);
app.use((req, res, next) => {
  console.log('REQ:', req.method, req.url);
  // Prevent browser from caching API responses
  if (!req.url.startsWith('/uploads')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
  }
  next();
});
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedHosts = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^http:\/\/192\.168\.(\d{1,3})\.(\d{1,3})(:\d+)?$/,
      /^http:\/\/10\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(:\d+)?$/,
      /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.(\d{1,3})\.(\d{1,3})(:\d+)?$/,
      /^https:\/\/longloy[a-z0-9\-]*\.vercel\.app$/,
      /^https:\/\/.*\.ngrok-free\.dev$/,
      /^https:\/\/.*\.ngrok-free\.app$/,
    ];

    const isAllowed = allowedHosts.some((pattern) => pattern.test(origin));
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
};

app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));

  const isApiRoute = (reqPath) => {
    const prefixes = [
      '/login', '/register', '/profile', '/user', '/user-orders', '/orders', '/shops',
      '/shop-orders', '/shop-sales', '/shop-reviews', '/floating-markets', '/products',
      '/product-reviews', '/product-detail', '/rewards', '/payments', '/market-reviews',
      '/cart', '/coupons', '/entrepreneur', '/add-entrepreneur', '/edit-shop',
      '/edit-product', '/my-shop', '/quiz', '/quests', '/upload-image', '/admin'
    ];

    return prefixes.some((prefix) => reqPath === prefix || reqPath.startsWith(`${prefix}/`));
  };

  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/uploads') || req.path.startsWith('/socket.io') || req.path.includes('.')) {
      return next();
    }

    // Browser page loads (refresh, typed URL, link click) send an Accept header
    // that prefers text/html; the frontend's own fetch/XHR calls never set that,
    // so this tells apart "user reloaded a page" from "app is calling an API"
    // even when a page route and an API route share the same path (e.g. /profile, /admin).
    const wantsHtml = (req.headers.accept || '').includes('text/html');
    if (!wantsHtml && isApiRoute(req.path)) {
      return next();
    }

    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

const db = mysql.createPool(getDbConfig());

// Test database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    console.error('Error details:', {
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage
    });
  } else {
    console.log('✅ Database connected successfully');
    connection.release();
  }
});

// Handle pool errors
db.on('error', (err) => {
  console.error('❌ Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 Connection was closed');
  }
  if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
    console.log('🔄 Connection had a fatal error');
  }
  if (err.code === 'PROTOCOL_ENQUEUE_AFTER_DESTROYING_CONNECTION') {
    console.log('🔄 Connection was destroyed');
  }
});

// ── JWT Secret + Omise Payment Gateway Config ────────────────
const SECRET_KEY = process.env.JWT_SECRET || "SUPER_SECRET_LONGLOY_APP";

// Omise payment gateway configuration
const OMISE_PUBLIC_KEY = 'pkey_test_67jj2870yfw03vwqb6h';
const OMISE_SECRET_KEY = 'skey_test_67jj287i8hgjiibrigj';
const OMISE_API_URL = 'https://api.omise.co';

// Helper function to make HTTPS requests to Omise API
function makeOmiseRequest(method, endpoint, data) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${OMISE_SECRET_KEY}:`).toString('base64');
    
    const options = {
      hostname: 'api.omise.co',
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          reject(new Error('Invalid JSON response from Omise'));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      const queryString = Object.keys(data)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
        .join('&');
      req.write(queryString);
    }
    
    req.end();
  });
}

// ── ตั้งค่า charset + migration เบื้องต้น ────────────────────
db.query("SET NAMES utf8mb4");

// Add open_days / open_hours columns to tbl_floating_markets (safe to run multiple times)
db.query(`ALTER TABLE tbl_floating_markets ADD COLUMN IF NOT EXISTS open_days VARCHAR(100) DEFAULT NULL`);
db.query(`ALTER TABLE tbl_floating_markets ADD COLUMN IF NOT EXISTS open_hours VARCHAR(50) DEFAULT NULL`);
db.query(`
  INSERT INTO tbl_floating_markets (market_id, open_days, open_hours)
  VALUES
    (101, 'เสาร์–อาทิตย์', '09:00–17:00'),
    (102, 'เสาร์–อาทิตย์', '09:00–16:00'),
    (103, 'เสาร์–อาทิตย์', '08:00–16:00'),
    (104, 'เสาร์–อาทิตย์', '08:00–17:00'),
    (105, 'เสาร์–อาทิตย์', '09:00–17:00'),
    (106, 'เสาร์–อาทิตย์', '08:00–15:00'),
    (107, 'เสาร์–อาทิตย์', '09:00–17:00'),
    (108, 'เสาร์–อาทิตย์', '09:00–16:00'),
    (109, 'เสาร์–อาทิตย์', '09:00–17:00'),
    (110, 'เสาร์–อาทิตย์', '08:00–16:00')
  ON DUPLICATE KEY UPDATE
    open_days = IF(open_days IS NULL, VALUES(open_days), open_days),
    open_hours = IF(open_hours IS NULL, VALUES(open_hours), open_hours)
`);

// Create user_steps table if it doesn't exist
const createUserStepsTable = `
  CREATE TABLE IF NOT EXISTS user_steps (
    step_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    step_count INT DEFAULT 0,
    reward_claimed BOOLEAN DEFAULT FALSE,
    reward_points INT DEFAULT 0,
    step_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, step_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

db.query(createUserStepsTable, (err) => {
  if (err) {
    console.error('❌ Failed to create user_steps table:', err);
  } else {
    console.log('✅ user_steps table ready');
  }
});

// ── initializeTables() — สร้าง/อัปเดตตาราง DB ตอน server เริ่ม ──
// รันทุกครั้งที่ server boot ปลอดภัย (ใช้ IF NOT EXISTS / ALTER ADD IF NOT EXISTS)
// ตารางที่สร้าง: payment_logs, tbl_redemption_history, tbl_coupon_usage,
//               tbl_quests, tbl_user_quests, tbl_quiz_questions,
//               tbl_settings, tbl_quiz_daily_sessions, tbl_product_sizes
// Migration: เพิ่มคอลัมน์ใหม่ให้ตารางเดิมถ้ายังไม่มี
const initializeTables = () => {
  // Drop and recreate tables to ensure clean state
  db.query('SET FOREIGN_KEY_CHECKS = 0', (err) => {
    if (err) console.error('SET FOREIGN_KEY_CHECKS error:', err);
  });

  // Note: tbl_orders table already exists in database schema with tourist_id
  // No need to create it here

  // Note: tbl_order_details table already exists in database
  // No need to create it here

  // Create payment_logs table
  const createPaymentLogsTable = `
    CREATE TABLE IF NOT EXISTS payment_logs (
      log_id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      user_id INT NOT NULL,
      charge_id VARCHAR(100),
      amount DECIMAL(10, 2),
      status VARCHAR(50),
      response LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES tbl_orders(order_id),
      FOREIGN KEY (user_id) REFERENCES tbl_users(user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  
  db.query(createPaymentLogsTable, (err) => {
    if (err) console.error('Create payment_logs error:', err);
    else {
      console.log('✅ payment_logs table ready');
      // Migration: make order_id nullable so reward redemptions (no order) can be logged
      db.query(
        `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_logs' AND COLUMN_NAME = 'order_id'`,
        (e2, rows) => {
          if (e2 || !rows?.length) return;
          if (rows[0].IS_NULLABLE === 'NO') {
            db.query(`ALTER TABLE payment_logs MODIFY order_id INT NULL`, (e3) => {
              if (e3) console.error('❌ Could not make order_id nullable:', e3.message);
              else console.log('✅ payment_logs.order_id is now nullable');
            });
          }
        }
      );
    }
  });

  // Create tbl_redemption_history (no FK so it works even if tbl_tourists is missing)
  const createRedemptionHistoryTable = `
    CREATE TABLE IF NOT EXISTS tbl_redemption_history (
      redeem_id INT AUTO_INCREMENT PRIMARY KEY,
      tourist_id INT NOT NULL,
      reward_id INT NOT NULL,
      points_spent INT NOT NULL,
      redemption_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  db.query(createRedemptionHistoryTable, (err) => {
    if (err) console.error('Create tbl_redemption_history error:', err);
    else {
      console.log('✅ tbl_redemption_history table ready');
      // Ensure redemption_date column exists (migration for older installs)
      db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_redemption_history' AND COLUMN_NAME = 'redemption_date'`,
        (err2, rows) => {
          if (err2) return;
          if (!rows || rows.length === 0) {
            db.query(
              `ALTER TABLE tbl_redemption_history ADD COLUMN redemption_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
              (err3) => {
                if (err3) console.error('❌ Failed to add redemption_date column:', err3.message);
                else console.log('✅ Added redemption_date column to tbl_redemption_history');
              }
            );
          }
        }
      );
      // Allow reward_id to be NULL so deleting a reward can preserve redemption
      // history instead of failing on the tbl_redemption_history_ibfk_2 FK constraint
      db.query(
        `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_redemption_history' AND COLUMN_NAME = 'reward_id'`,
        (err4, rows) => {
          if (err4 || !rows || !rows.length) return;
          if (rows[0].IS_NULLABLE === 'NO') {
            db.query(`ALTER TABLE tbl_redemption_history MODIFY COLUMN reward_id INT NULL`, (err5) => {
              if (err5) console.error('❌ Failed to make reward_id nullable:', err5.message);
              else console.log('✅ tbl_redemption_history.reward_id is now nullable');
            });
          }
        }
      );
    }
  });

  // Create tbl_coupon_usage to track used coupons
  const createCouponUsageTable = `
    CREATE TABLE IF NOT EXISTS tbl_coupon_usage (
      usage_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      coupon_code VARCHAR(100) NOT NULL,
      order_id INT DEFAULT NULL,
      discount_amount INT DEFAULT 0,
      used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_coupon (coupon_code),
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  db.query(createCouponUsageTable, (err) => {
    if (err) console.error('Create tbl_coupon_usage error:', err);
    else {
      console.log('✅ tbl_coupon_usage table ready');
      // Migration: add redeem_id column to track per-instance usage
      db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_coupon_usage' AND COLUMN_NAME = 'redeem_id'`,
        (e, rows) => {
          if (!e && !rows?.length) {
            db.query(`ALTER TABLE tbl_coupon_usage ADD COLUMN redeem_id INT NULL AFTER coupon_code, ADD INDEX idx_redeem (redeem_id)`,
              (e2) => { if (!e2) console.log('✅ tbl_coupon_usage.redeem_id added'); });
          }
        }
      );
    }
  });

  // Migration: add max_redemptions column to tbl_rewards (global limit per reward)
  db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_rewards' AND COLUMN_NAME = 'max_redemptions'`,
    (e, rows) => {
      if (!e && !rows?.length) {
        db.query(`ALTER TABLE tbl_rewards ADD COLUMN max_redemptions INT DEFAULT NULL AFTER discount_amount`,
          (e2) => { if (!e2) console.log('✅ tbl_rewards.max_redemptions added'); });
      }
    }
  );

  // Ensure discount_amount column exists in tbl_rewards
  const checkDiscountColSql = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_rewards' AND COLUMN_NAME = 'discount_amount'`;
  db.query(checkDiscountColSql, (err, rows) => {
    if (err) { console.error('discount_amount column check error:', err); return; }
    if (rows[0].cnt === 0) {
      db.query('ALTER TABLE tbl_rewards ADD COLUMN discount_amount INT DEFAULT 0', (err2) => {
        if (err2) { console.error('❌ Failed to add discount_amount:', err2); return; }
        // Set discount_amount = points_required for existing rows
        db.query('UPDATE tbl_rewards SET discount_amount = points_required WHERE discount_amount = 0', (err3) => {
          if (err3) console.error('Failed to backfill discount_amount:', err3);
          else console.log('✅ Added discount_amount column to tbl_rewards');
        });
      });
    } else {
      console.log('✅ tbl_rewards.discount_amount column exists');
    }
  });

  // Ensure expiration_date column exists in tbl_rewards (for coupon expiry)
  const checkExpiryColSql = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_rewards' AND COLUMN_NAME = 'expiration_date'`;
  db.query(checkExpiryColSql, (err, rows) => {
    if (err) { console.error('expiration_date column check error:', err); return; }
    if (rows[0].cnt === 0) {
      db.query('ALTER TABLE tbl_rewards ADD COLUMN expiration_date DATE NULL', (err2) => {
        if (err2) { console.error('❌ Failed to add expiration_date:', err2); return; }
        console.log('✅ Added expiration_date column to tbl_rewards');
      });
    } else {
      console.log('✅ tbl_rewards.expiration_date column exists');
    }
  });

  // Ensure current_points column exists in tbl_users (added later; may be missing)
  const checkColSql = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_users' AND COLUMN_NAME = 'current_points'`;
  db.query(checkColSql, (err, rows) => {
    if (err) { console.error('Column check error:', err); return; }
    if (rows[0].cnt === 0) {
      db.query('ALTER TABLE tbl_users ADD COLUMN current_points INT DEFAULT 0', (err2) => {
        if (err2) console.error('❌ Failed to add current_points column:', err2);
        else console.log('✅ Added current_points column to tbl_users');
      });
    } else {
      console.log('✅ tbl_users.current_points column exists');
    }
  });

  // Ensure points_expiry_date column exists in tbl_users (วันหมดอายุแต้ม 4 ปี)
  const checkExpirySql = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_users' AND COLUMN_NAME = 'points_expiry_date'`;
  db.query(checkExpirySql, (err, rows) => {
    if (err) { console.error('Expiry column check error:', err); return; }
    if (rows[0].cnt === 0) {
      db.query('ALTER TABLE tbl_users ADD COLUMN points_expiry_date DATE NULL', (err2) => {
        if (err2) console.error('❌ Failed to add points_expiry_date column:', err2);
        else {
          console.log('✅ Added points_expiry_date column to tbl_users');
          // Set expiry 4 years from now for all existing users who have points
          db.query(
            'UPDATE tbl_users SET points_expiry_date = DATE_ADD(NOW(), INTERVAL 4 YEAR) WHERE current_points > 0',
            (err3) => {
              if (err3) console.error('❌ Failed to backfill points_expiry_date:', err3);
              else console.log('✅ Backfilled points_expiry_date for existing users');
            }
          );
        }
      });
    } else {
      console.log('✅ tbl_users.points_expiry_date column exists');
    }
  });

  // ── Quest system tables ────────────────────────────────────────
  db.query(`
    CREATE TABLE IF NOT EXISTS tbl_quests (
      quest_id       INT AUTO_INCREMENT PRIMARY KEY,
      name           VARCHAR(100) NOT NULL,
      description    TEXT,
      quest_type     ENUM('buy_count','buy_amount','visit_shops','buy_in_market','visit_markets','buy_from_shop') NOT NULL,
      target_value   INT NOT NULL,
      market_id      INT DEFAULT NULL,
      shop_id        INT DEFAULT NULL,
      points_reward  INT DEFAULT 50,
      icon           VARCHAR(10) DEFAULT '🎯',
      is_active      TINYINT(1) DEFAULT 1,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, (err) => {
    if (err) console.error('❌ tbl_quests create error:', err.message);
    else {
      console.log('✅ tbl_quests ready');
      // Seed default quests (global)
      db.query(`
        INSERT IGNORE INTO tbl_quests (quest_id, name, description, quest_type, target_value, points_reward, icon) VALUES
        (1,  'นักช้อปมือใหม่',       'สั่งซื้อสินค้าครั้งแรก',                'buy_count',      1,   50,  '🛍️'),
        (2,  'นักช้อปตัวจริง',       'สั่งซื้อสินค้าครบ 3 ครั้ง',              'buy_count',      3,  150,  '🛒'),
        (3,  'แกรนด์ช้อปเปอร์',      'สั่งซื้อสินค้าครบ 5 ครั้ง',              'buy_count',      5,  300,  '🏆'),
        (4,  'ใจป้ำ!',               'ซื้อสินค้ารวมมูลค่า 200 บาทขึ้นไป',      'buy_amount',   200,  100,  '💰'),
        (5,  'สปาครบตลาด',           'ซื้อสินค้ารวมมูลค่า 500 บาทขึ้นไป',      'buy_amount',   500,  250,  '💎'),
        (6,  'นักสำรวจตลาดน้ำ',      'ซื้อสินค้าจาก 2 ร้านค้าที่ต่างกัน',      'visit_shops',    2,  100,  '🗺️'),
        (7,  'ท่องเที่ยวครบสูตร',     'ซื้อสินค้าจาก 3 ร้านค้าที่ต่างกัน',      'visit_shops',    3,  200,  '🚢'),
        (11, 'สายน้ำคลองลัดมะยม',    'ซื้อสินค้าจากตลาดน้ำคลองลัดมะยม 1 ครั้ง',  'buy_in_market',  1,   75,  '🌿'),
        (12, 'วิถีคลองบางหลวง',      'ซื้อสินค้าจากตลาดน้ำคลองบางหลวง 1 ครั้ง',  'buy_in_market',  1,   75,  '🎨'),
        (13, 'ลุยตลาดตลิ่งชัน',      'ซื้อสินค้าจากตลาดน้ำตลิ่งชัน 1 ครั้ง',     'buy_in_market',  1,   75,  '🛶'),
        (14, 'รักขวัญเรียม',         'ซื้อสินค้าจากตลาดน้ำขวัญเรียม 1 ครั้ง',     'buy_in_market',  1,   75,  '💕'),
        (15, 'ย้อนรอยหัวตะเข้',      'ซื้อสินค้าจากตลาดเก่าหัวตะเข้ 1 ครั้ง',     'buy_in_market',  1,   75,  '🏚️'),
        (16, 'ศรัทธาวัดสะพาน',       'ซื้อสินค้าจากตลาดน้ำวัดสะพาน 1 ครั้ง',      'buy_in_market',  1,   75,  '⛩️'),
        (17, 'สองคลองสองใจ',         'ซื้อสินค้าจากตลาดน้ำสองคลองวัดตลิ่งชัน 1 ครั้ง','buy_in_market',1,   75,  '🌊'),
        (18, 'นักเดินทางตลาดน้ำ',    'ซื้อสินค้าจากตลาดน้ำที่ต่างกัน 3 แห่ง',   'visit_markets',  3,  400,  '🏅')
      `, (seedErr) => {
        if (seedErr) console.error('❌ quest seed error:', seedErr.message);
        else console.log('✅ Default quests seeded');
      });

      // Add market_id column values for buy_in_market quests
      db.query(`
        UPDATE tbl_quests SET market_id = CASE quest_id
          WHEN 11 THEN 101 WHEN 12 THEN 102 WHEN 13 THEN 103
          WHEN 14 THEN 104 WHEN 15 THEN 105 WHEN 16 THEN 106 WHEN 17 THEN 107
          ELSE market_id END
        WHERE quest_id BETWEEN 11 AND 17
      `, (mErr) => { if (mErr) console.error('❌ market_id update error:', mErr.message); });

      // Migration: ensure ENUM includes all quest types (for existing DBs)
      db.query(
        `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_quests' AND COLUMN_NAME = 'quest_type'`,
        (e, rows) => {
          if (e || !rows?.length) return;
          const colType = rows[0].COLUMN_TYPE;
          if (!colType.includes('buy_from_shop') || !colType.includes('visit_markets')) {
            db.query(
              `ALTER TABLE tbl_quests MODIFY COLUMN quest_type
               ENUM('buy_count','buy_amount','visit_shops','buy_in_market','visit_markets','buy_from_shop') NOT NULL`,
              (e2) => {
                if (e2) console.error('❌ ENUM alter error:', e2.message);
                else console.log('✅ tbl_quests.quest_type ENUM updated');
              }
            );
          }
          db.query(
            `UPDATE tbl_quests SET quest_type = 'visit_markets' WHERE quest_id = 18 AND (quest_type = '' OR quest_type IS NULL)`,
            () => {}
          );
        }
      );

      // Migration: add shop_id column to tbl_quests if missing (for existing DBs)
      db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_quests' AND COLUMN_NAME = 'shop_id'`,
        (e, rows) => {
          if (e) return;
          if (!rows?.length) {
            db.query(
              `ALTER TABLE tbl_quests ADD COLUMN shop_id INT DEFAULT NULL AFTER market_id`,
              (e2) => {
                if (e2) console.error('❌ shop_id column add error:', e2.message);
                else console.log('✅ tbl_quests.shop_id column added');
              }
            );
          }
        }
      );
    }
  });

  db.query(`
    CREATE TABLE IF NOT EXISTS tbl_user_quests (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      user_id        INT NOT NULL,
      quest_id       INT NOT NULL,
      reward_claimed TINYINT(1) DEFAULT 0,
      claimed_at     TIMESTAMP NULL,
      UNIQUE KEY uq_user_quest (user_id, quest_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, (err) => {
    if (err) console.error('❌ tbl_user_quests create error:', err.message);
    else console.log('✅ tbl_user_quests ready');
  });

  // Quiz questions table
  db.query(`
    CREATE TABLE IF NOT EXISTS tbl_quiz_questions (
      question_id    INT AUTO_INCREMENT PRIMARY KEY,
      question       TEXT NOT NULL,
      option_a       VARCHAR(255) NOT NULL,
      option_b       VARCHAR(255) NOT NULL,
      option_c       VARCHAR(255) NOT NULL,
      option_d       VARCHAR(255) NOT NULL,
      correct_answer TINYINT(1) NOT NULL COMMENT '0=A,1=B,2=C,3=D',
      points         INT DEFAULT 10,
      is_active      TINYINT(1) DEFAULT 1,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, (err) => {
    if (err) console.error('❌ tbl_quiz_questions error:', err.message);
    else {
      console.log('✅ tbl_quiz_questions ready');
      db.query(`SELECT COUNT(*) AS cnt FROM tbl_quiz_questions`, (e, rows) => {
        if (!e && rows[0].cnt === 0) {
          db.query(`INSERT INTO tbl_quiz_questions (question,option_a,option_b,option_c,option_d,correct_answer,points) VALUES
            ('ตลาดน้ำลอยสูง (LongLoy) ตั้งอยู่ในจังหวัดไหน?','นครปฐม','สมุทรสงคราม','ราชบุรี','สุพรรณบุรี',1,10),
            ('ในเกมนี้ 1,000 แต้ม เท่ากับค่าอะไร?','1 บาท','10 บาท','100 บาท','1,000 บาท',2,15),
            ('ชื่อเรือที่ใช้ในตลาดน้ำไทยเรียกว่าอะไร?','เรือสาง','เรือหัวลาก','เรือยาง','เรือเหล็ก',0,10),
            ('สินค้าไหนที่นิยมขายในตลาดน้ำ?','ลวดหนัก','ผักสดใหม่','โทรศัพท์','รองเท้ามหาภาค',1,12),
            ('การเดินทางไปตลาดน้ำในช่วงเช้าดีที่สุดเพราะ?','ฟรีค่าเรือ','อากาศสดชื่น','เหลือน้อยไป','ราคาแพงกว่า',1,10)
          `, (e2) => { if (e2) console.error('Quiz seed error:', e2.message); else console.log('✅ Quiz questions seeded'); });
        }
      });
    }
  });

  // Game settings table
  db.query(`
    CREATE TABLE IF NOT EXISTS tbl_settings (
      setting_key   VARCHAR(64) PRIMARY KEY,
      setting_value VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, (err) => {
    if (err) console.error('❌ tbl_settings error:', err.message);
    else {
      db.query(`INSERT IGNORE INTO tbl_settings (setting_key, setting_value) VALUES ('game_enabled', '1')`, (e2) => {
        if (!e2) console.log('✅ tbl_settings ready');
      });
    }
  });

  // Daily quiz session table
  db.query(`
    CREATE TABLE IF NOT EXISTS tbl_quiz_daily_sessions (
      session_id   INT AUTO_INCREMENT PRIMARY KEY,
      user_id      INT NOT NULL,
      quiz_date    DATE NOT NULL,
      question_ids VARCHAR(200) NOT NULL COMMENT 'comma-separated question_ids',
      score        INT DEFAULT 0,
      completed    TINYINT(1) DEFAULT 0,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_date (user_id, quiz_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, (err) => {
    if (err) console.error('❌ tbl_quiz_daily_sessions error:', err.message);
    else console.log('✅ tbl_quiz_daily_sessions ready');
  });

  // Migration: create tbl_shops records for entrepreneurs that don't have one
  db.query(
    `INSERT INTO tbl_shops (market_id, entrepreneur_id, description, status)
     SELECT e.market_id, e.entrepreneurs_id, NULLIF(e.description,''), 'Open'
     FROM tbl_entrepreneurs e
     LEFT JOIN tbl_shops s ON s.entrepreneur_id = e.entrepreneurs_id
     WHERE s.shop_id IS NULL`,
    (err, result) => {
      if (err) console.error('❌ shops backfill error:', err.message);
      else if (result.affectedRows > 0) console.log(`✅ Created ${result.affectedRows} missing tbl_shops record(s)`);
      else console.log('✅ All entrepreneurs already have tbl_shops records');
    }
  );

  // Migration: sync tbl_shops.description from tbl_entrepreneurs where description is NULL
  db.query(
    `UPDATE tbl_shops s
     JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
     SET s.description = NULLIF(e.description, '')
     WHERE s.description IS NULL AND e.description IS NOT NULL AND e.description != ''`,
    (err, result) => {
      if (err) console.error('❌ shops description sync error:', err.message);
      else if (result.affectedRows > 0) console.log(`✅ Synced description for ${result.affectedRows} shop(s)`);
    }
  );

  // Migration: add per-shop shop_name column so each shop can have its own name
  db.query(`ALTER TABLE tbl_shops ADD COLUMN shop_name VARCHAR(255) NULL DEFAULT NULL`, (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      console.error('❌ tbl_shops.shop_name column error:', err.message);
    } else {
      // Backfill: copy shop_name from tbl_entrepreneurs for shops that don't have one yet
      db.query(
        `UPDATE tbl_shops s
         JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
         SET s.shop_name = e.shop_name
         WHERE s.shop_name IS NULL AND e.shop_name IS NOT NULL`,
        (err2, r2) => {
          if (err2) console.error('❌ shop_name backfill error:', err2.message);
          else if (r2?.affectedRows > 0) console.log(`✅ Backfilled shop_name for ${r2.affectedRows} shop(s)`);
          else console.log('✅ tbl_shops.shop_name ready');
        }
      );
    }
  });

  // Migration: add unit + description columns to tbl_products
  db.query(`ALTER TABLE tbl_products ADD COLUMN unit VARCHAR(50) DEFAULT NULL AFTER price`, (e) => {
    if (e && e.code !== 'ER_DUP_FIELDNAME') console.error('❌ tbl_products.unit:', e.message);
    else if (!e) console.log('✅ tbl_products.unit added');
  });
  db.query(`ALTER TABLE tbl_products ADD COLUMN description TEXT DEFAULT NULL AFTER unit`, (e) => {
    if (e && e.code !== 'ER_DUP_FIELDNAME') console.error('❌ tbl_products.description:', e.message);
    else if (!e) console.log('✅ tbl_products.description added');
  });

  // Migration: create tbl_product_sizes (max 5 sizes per product)
  db.query(`
    CREATE TABLE IF NOT EXISTS tbl_product_sizes (
      size_id          INT AUTO_INCREMENT PRIMARY KEY,
      product_id       INT            NOT NULL,
      size_name        VARCHAR(100)   NOT NULL,
      price_adjustment DECIMAL(10,2)  DEFAULT 0,
      sort_order       TINYINT        DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES tbl_products(product_id) ON DELETE CASCADE,
      INDEX idx_product (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, (e) => {
    if (e) console.error('❌ tbl_product_sizes:', e.message);
    else console.log('✅ tbl_product_sizes ready');
  });

  // Migration: add AwaitingPayment to tbl_orders.status ENUM if not present
  db.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_orders' AND COLUMN_NAME = 'status'`,
    (err, rows) => {
      if (err || !rows?.length) return;
      const colType = rows[0].COLUMN_TYPE || '';
      if (!colType.includes('AwaitingPayment')) {
        db.query(
          `ALTER TABLE tbl_orders MODIFY COLUMN status ENUM('AwaitingPayment','Pending','Cooking','Completed','Cancelled') DEFAULT 'AwaitingPayment'`,
          (e2) => {
            if (e2) console.error('❌ Failed to add AwaitingPayment to tbl_orders.status:', e2.message);
            else console.log('✅ tbl_orders.status ENUM updated with AwaitingPayment');
          }
        );
      } else {
        console.log('✅ tbl_orders.status already has AwaitingPayment');
      }
    }
  );

  // Migration: add Confirmed status to tbl_orders.status ENUM
  db.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_orders' AND COLUMN_NAME = 'status'`,
    (err, rows) => {
      if (err || !rows?.length) return;
      const colType = rows[0].COLUMN_TYPE || '';
      if (!colType.includes('Confirmed')) {
        db.query(
          `ALTER TABLE tbl_orders MODIFY COLUMN status ENUM('AwaitingPayment','Pending','Confirmed','Cooking','Completed','Cancelled') DEFAULT 'AwaitingPayment'`,
          (e2) => {
            if (e2) console.error('❌ Failed to add Confirmed to tbl_orders.status:', e2.message);
            else console.log('✅ tbl_orders.status ENUM updated with Confirmed');
          }
        );
      } else {
        console.log('✅ tbl_orders.status already has Confirmed');
      }
    }
  );

  // Migration: add payment_method column to tbl_orders
  db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_orders' AND COLUMN_NAME = 'payment_method'`,
    (err, rows) => {
      if (err) return;
      if (!rows?.length) {
        db.query(
          `ALTER TABLE tbl_orders ADD COLUMN payment_method ENUM('card','cash') NOT NULL DEFAULT 'card' AFTER status`,
          (e2) => {
            if (e2) console.error('❌ payment_method column error:', e2.message);
            else console.log('✅ tbl_orders.payment_method column added');
          }
        );
      } else {
        console.log('✅ tbl_orders.payment_method ready');
      }
    }
  );
};

// Initialize tables on startup
initializeTables();

// ============================================================
// AUTH ROUTES — ล็อกอิน, สมัครสมาชิก, Middleware ตรวจ token
// ============================================================

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }
  const sql = "SELECT * FROM tbl_users WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!result || result.length === 0) {
      return res.status(401).json({ error: "Authentication error" });
    }
    const user = result[0];
    if (!user.is_active) return res.status(403).json({ error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อแอดมิน" });
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).json({ error: "Password compare error" });
      if (!isMatch) return res.status(401).json({ error: "Authentication error" });
      const token = jwt.sign({ user_id: user.user_id, role: user.role }, SECRET_KEY, { expiresIn: '7d' });
      res.json({
        message: "Login success",
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          role: user.role,
          is_active: user.is_active
        }
      });
    });
  });
});

// verifyToken — Middleware แนบกับทุก route ที่ต้อง login
// อ่าน Bearer token จาก Authorization header → verify JWT → ใส่ req.user_id
// ถ้า token หมดอายุหรือ user ถูก ban → ตอบ 401/403 ทันที
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (!token) {
    token = authHeader || (req.query && req.query.token) || (req.body && req.body.token);
  }
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    if (!decoded || !decoded.user_id) return res.status(403).json({ error: 'Invalid token structure' });
    db.query('SELECT is_active FROM tbl_users WHERE user_id = ?', [decoded.user_id], (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!result || result.length === 0) return res.status(404).json({ error: 'User not found' });
      if (!result[0].is_active) return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งาน', banned: true });
      req.user_id = decoded.user_id;
      next();
    });
  });
}

app.get('/profile', verifyToken, (req, res) => {
  const user_id = req.user_id;
  const sql = `SELECT user_id, email, first_name, last_name, phone, role, is_active FROM tbl_users WHERE user_id = ?`;
  db.query(sql, [user_id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result[0] });
  });
});

app.post('/register', async (req, res) => {
  const { name, lastname, tel, email, password } = req.body;
  
  // Character limit validation (สมเหตุสมผล)
  if (!name || name.length > 20) {
    return res.status(400).json({ error: 'ชื่อต้องไม่เกิน 20 ตัวอักษร' });
  }
  if (!lastname || lastname.length > 20) {
    return res.status(400).json({ error: 'นามสกุลต้องไม่เกิน 20 ตัวอักษร' });
  }
  if (!tel || tel.length > 10) {
    return res.status(400).json({ error: 'เบอร์โทรต้องไม่เกิน 10 ตัวอักษร' });
  }
  if (!email || email.length > 50) {
    return res.status(400).json({ error: 'อีเมลต้องไม่เกิน 50 ตัวอักษร' });
  }
  if (!password || password.length > 20 || !password.trim()) {
    return res.status(400).json({ error: 'รหัสผ่านต้องไม่เกิน 20 ตัวอักษร' });
  }
  
  const checkSql = "SELECT user_id FROM tbl_users WHERE email = ?";
  db.query(checkSql, [email], async (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (result.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const idSql = `SELECT LPAD(IFNULL(MAX(CAST(user_id AS UNSIGNED)),0)+1,3,'0') AS newId FROM tbl_users`;
    db.query(idSql, async (err, idResult) => {
      if (err) return res.status(500).json({ error: 'ID generation failed' });
      const newUserId = idResult[0].newId;
      const is_active = 1;
      const role = 1;
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertSql = `INSERT INTO tbl_users (user_id, password, email, first_name, last_name, phone, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
        db.query(
          insertSql,
          [newUserId, hashedPassword, email, name, lastname, tel, role, is_active],
          (err) => {
            if (err) return res.status(500).json({ error: 'Registration failed' });
            res.json({ message: 'Register success', user_id: newUserId });
          }
        );
      } catch (bcryptErr) {
        return res.status(500).json({ error: 'Password hashing failed' });
      }
    });
  });
});


// ============================================================
// MARKET ROUTES — ตลาดน้ำ (tbl_floating_markets)
//   GET /floating-markets/search      ค้นหาตลาดตามชื่อ
//   GET /floating-markets/all         ดึงทั้งหมด + จำนวนร้านในแต่ละตลาด
//   GET /floating-markets/top3-weekly ท็อป 3 ตลาดที่มียอดสั่งซื้อสูงสุดในสัปดาห์นี้
// ============================================================

// Search floating markets by name (partial match)
app.get('/floating-markets/search', (req, res) => {
  // รองรับทั้งกรณีไม่มี query string (เช่น /floating-markets/search) และมี (เช่น /floating-markets/search?q=)
  const q = req.query.q || '';
  console.log('📍 GET /floating-markets/search - q:', q);
  const sql = `SELECT * FROM tbl_floating_markets WHERE name LIKE ? ORDER BY name`;
  db.query(sql, [`%${q}%`], (err, results) => {
    if (err) {
      console.error('❌ Error fetching markets:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
    console.log('✅ Markets found:', results?.length || 0);
    res.json(results || []);
  });
});

// Get all floating markets (for frontend initial load)
app.get('/floating-markets/all', (req, res) => {
  console.log('📍 GET /floating-markets/all');
  const sql = `
    SELECT fm.*, COUNT(s.shop_id) AS shop_count
    FROM tbl_floating_markets fm
    LEFT JOIN tbl_shops s ON s.market_id = fm.market_id AND s.status = 'Open'
    GROUP BY fm.market_id
    ORDER BY fm.name
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching all markets:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
    console.log('✅ All markets fetched:', results?.length || 0);
    res.json(results || []);
  });
});

// Top 3 markets by order count this week, fallback to all-time if no weekly orders
app.get('/floating-markets/top3-weekly', (req, res) => {
  const weeklySql = `
    SELECT
      fm.market_id, fm.name, fm.description, fm.image_url, fm.location,
      COUNT(o.order_id) AS order_count
    FROM tbl_floating_markets fm
    LEFT JOIN tbl_shops s ON s.market_id = fm.market_id
    LEFT JOIN tbl_orders o
      ON o.shop_id = s.shop_id
      AND YEARWEEK(o.created_at, 1) = YEARWEEK(NOW(), 1)
      AND o.status != 'cancelled'
    GROUP BY fm.market_id, fm.name, fm.description, fm.image_url, fm.location
    ORDER BY order_count DESC
    LIMIT 3
  `;
  const allTimeSql = `
    SELECT
      fm.market_id, fm.name, fm.description, fm.image_url, fm.location,
      COUNT(o.order_id) AS order_count
    FROM tbl_floating_markets fm
    LEFT JOIN tbl_shops s ON s.market_id = fm.market_id
    LEFT JOIN tbl_orders o
      ON o.shop_id = s.shop_id
      AND o.status != 'cancelled'
    GROUP BY fm.market_id, fm.name, fm.description, fm.image_url, fm.location
    ORDER BY order_count DESC
    LIMIT 3
  `;
  db.query(weeklySql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error', detail: err.message });
    const hasOrders = results && results.some(r => r.order_count > 0);
    if (hasOrders) return res.json(results);
    // No orders this week — fallback to all-time top 3
    db.query(allTimeSql, (err2, fallback) => {
      if (err2) return res.status(500).json({ error: 'Database error', detail: err2.message });
      res.json(fallback || []);
    });
  });
});

// ============================================================
// SHOP & PRODUCT ROUTES — ร้านค้าและสินค้า
//   GET  /shops/by-market/:id          ร้านทั้งหมดในตลาด
//   GET  /shops/:shop_id               ข้อมูลร้านเดียว
//   GET  /product-detail/:id           รายละเอียดสินค้า + sizes
//   GET  /products/by-shop/:id         สินค้าทั้งหมดในร้าน
//   GET  /products/by-entre/:id        สินค้าทั้งหมดของผู้ประกอบการ
// ============================================================

// Get all shops by market_id
// By default only shows shops whose entrepreneur has been approved (is_verified = 1) —
// pass ?all=1 (used by the admin panel) to also include shops still pending approval.
app.get('/shops/by-market/:market_id', (req, res) => {
  const { market_id } = req.params;
  const includeUnapproved = req.query.all === '1';
  console.log('🏪 GET /shops/by-market/:market_id - market_id:', market_id);
  const sql = `
    SELECT s.shop_id, s.market_id, s.entrepreneur_id, s.image_url, s.status,
           s.latitude, s.longitude,
           COALESCE(s.shop_name, e.shop_name) AS shop_name, e.shop_number, e.category,
           e.phone_number, e.description,
           e.open_time, e.close_time, e.is_verified
    FROM tbl_shops s
    LEFT JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
    WHERE s.market_id = ? ${includeUnapproved ? '' : 'AND e.is_verified = 1'}
    ORDER BY s.shop_id
  `;
  db.query(sql, [market_id], (err, results) => {
    if (err) {
      console.error('❌ Error fetching shops:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
    console.log('✅ Shops found:', results?.length || 0);
    res.json(results || []);
  });
});

// Get single product by product_id
app.get('/product-detail/:product_id', async (req, res) => {
  const { product_id } = req.params;
  try {
    const rows = await queryAsync(
      `SELECT p.*,
              COALESCE(s.shop_name, e.shop_name) AS shop_name,
              e.shop_name                         AS entrepreneur_shop_name,
              fm.name                             AS market_name,
              s.shop_id,
              s.market_id
       FROM tbl_products p
       LEFT JOIN tbl_shops s        ON p.shop_id = s.shop_id
       LEFT JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
       LEFT JOIN tbl_floating_markets fm ON s.market_id = fm.market_id
       WHERE p.product_id = ?`,
      [product_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    const product = rows[0];
    const sizes = await queryAsync(
      'SELECT size_id, size_name, price_adjustment, sort_order FROM tbl_product_sizes WHERE product_id = ? ORDER BY sort_order',
      [product_id]
    ).catch(() => []);
    res.json({ ...product, sizes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all products by shop_id (with sizes)
app.get('/products/by-shop/:shop_id', async (req, res) => {
  const { shop_id } = req.params;
  try {
    const products = await queryAsync('SELECT * FROM tbl_products WHERE shop_id = ? ORDER BY product_id', [shop_id]);
    if (!products.length) return res.json([]);
    const productIds = products.map(p => p.product_id);
    const sizes = await queryAsync(
      `SELECT * FROM tbl_product_sizes WHERE product_id IN (${productIds.map(() => '?').join(',')}) ORDER BY product_id, sort_order`,
      productIds
    ).catch(() => []);
    const sizeMap = {};
    sizes.forEach(s => { if (!sizeMap[s.product_id]) sizeMap[s.product_id] = []; sizeMap[s.product_id].push(s); });
    res.json(products.map(p => ({ ...p, sizes: sizeMap[p.product_id] || [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get shop info by shop_id
app.get('/shops/:shop_id', (req, res) => {
  const { shop_id } = req.params;
  console.log('🏪 GET /shops/:shop_id - shop_id:', shop_id);
  const sql = `SELECT s.*, COALESCE(s.shop_name, e.shop_name) AS shop_name, e.phone_number, e.description, e.location, e.open_time, e.close_time, fm.name as market_name
               FROM tbl_shops s
               LEFT JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
               LEFT JOIN tbl_floating_markets fm ON s.market_id = fm.market_id
               WHERE s.shop_id = ? LIMIT 1`;
  db.query(sql, [shop_id], (err, results) => {
    if (err) {
      console.error('❌ Error fetching shop:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
    if (!results || results.length === 0) {
      console.warn('⚠️ Shop not found:', shop_id);
      return res.status(404).json({ error: 'Shop not found' });
    }
    console.log('✅ Shop found:', results[0].shop_id);
    res.json(results[0]);
  });
});

// NEW: Get all products by entre_id
// Get all products by entrepreneurs_id (join products and entrepreneurs by shop_id)
// ดึงสินค้าทั้งหมดของ entrepreneurs_id (รองรับหลายร้าน)
app.get('/products/by-entre/:entrepreneurs_id', (req, res) => {
  const { entrepreneurs_id } = req.params;
  console.log('🛍️ GET /products/by-entre/:entrepreneurs_id - entrepreneurs_id:', entrepreneurs_id);
  // ดึง shop_id ทั้งหมดที่เป็นของ entrepreneurs_id
  const shopSql = 'SELECT shop_id FROM tbl_shops WHERE entrepreneur_id = ?';
  db.query(shopSql, [entrepreneurs_id], (err, shopRows) => {
    if (err) {
      console.error('❌ Error fetching shops for entrepreneur:', err);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
    if (!shopRows || shopRows.length === 0) {
      console.log('⚠️ No shops found for entrepreneur:', entrepreneurs_id);
      return res.json([]);
    }
    const shopIds = shopRows.map(r => r.shop_id);
    console.log('✅ Found', shopIds.length, 'shops for this entrepreneur');
    // ดึงสินค้าทั้งหมดของร้านเหล่านี้
    const prodSql = `SELECT * FROM tbl_products WHERE shop_id IN (${shopIds.map(() => '?').join(',')}) ORDER BY product_id`;
    db.query(prodSql, shopIds, (err, prodRows) => {
      if (err) {
        console.error('❌ Error fetching products:', err);
        return res.status(500).json({ error: 'Database error', detail: err.message });
      }
      console.log('✅ Products found:', prodRows?.length || 0);
      res.json(prodRows || []);
    });
  });
});

// ============================================================
// ENTREPRENEUR ROUTES — ผู้ประกอบการและการจัดการร้านค้า
//   POST /add-entrepreneur             สมัครเป็นผู้ประกอบการ + สร้างร้าน
//   GET  /entrepreneur/my-shops        ร้านทั้งหมดของผู้ใช้ที่ login อยู่
//   GET  /entrepreneur/:user_id        ข้อมูลผู้ประกอบการตาม user_id
//   GET  /my-shop                      ข้อมูลร้านของตัวเอง (สำหรับหน้า EditShop)
//   PUT  /entrepreneur/shop-status/:id สลับสถานะ Open/Closed
//   POST /edit-shop                    แก้ไขชื่อร้าน รูป เบอร์ ฯลฯ
//   GET  /shop-sales/:shop_id          ยอดขายรายเดือนของร้าน
// ============================================================

// Add new entrepreneur/shop
app.post('/add-entrepreneur', verifyToken, (req, res) => {
  const {
    shop_name, shop_number, category, phone_number, phone_number2,
    description, open_time, close_time, location,
    full_name, id_card_number,
    bank_account_no, bank_name, is_verified, market_id, image_url
  } = req.body;

  const user_id = req.user_id; // ดึง user_id จาก token

  // Validate required fields
  if (!shop_name || !category || !phone_number || !location || !open_time || !close_time || !full_name || !id_card_number || !bank_account_no || !bank_name || !market_id) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
  }

  const categoryStr = Array.isArray(category) ? category.filter(Boolean).join(',') : category;

  const MAX_SHOPS_PER_USER = 10;

  // จำกัดจำนวนร้านค้าต่อคน
  db.query(
    `SELECT COUNT(*) AS cnt FROM tbl_entrepreneurs WHERE user_id = ?`,
    [user_id],
    (limitErr, limitRows) => {
      if (limitErr) return res.status(500).json({ error: 'Database error' });
      if (limitRows[0].cnt >= MAX_SHOPS_PER_USER) {
        return res.status(409).json({ error: `คุณมีร้านค้าครบ ${MAX_SHOPS_PER_USER} ร้านแล้ว ไม่สามารถเพิ่มร้านค้าใหม่ได้` });
      }

  // ตรวจสอบชื่อร้านซ้ำก่อน insert
  db.query(
    `SELECT COUNT(*) AS cnt FROM tbl_shops s
     LEFT JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
     WHERE COALESCE(s.shop_name, e.shop_name) = ?`,
    [shop_name.trim()],
    (dupErr, dupRows) => {
      if (dupErr) return res.status(500).json({ error: 'Database error' });
      if (dupRows[0].cnt > 0) {
        return res.status(409).json({ error: `ชื่อร้านค้า "${shop_name}" มีอยู่แล้วในระบบ กรุณาใช้ชื่ออื่น` });
      }

      const sql = `INSERT INTO tbl_entrepreneurs
        (shop_name, shop_number, category, phone_number, phone_number2, description, open_time, close_time, location, user_id, full_name, id_card_number, bank_account_no, bank_name, is_verified, market_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

      db.query(sql, [
        shop_name, shop_number, categoryStr, phone_number, phone_number2, description, open_time, close_time, location,
        user_id, full_name, id_card_number, bank_account_no, bank_name, is_verified, market_id
      ], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }

        const entrepreneurs_id = result.insertId;

        db.query(
          `INSERT INTO tbl_shops (market_id, entrepreneur_id, shop_name, description, image_url, status) VALUES (?, ?, ?, ?, ?, 'Open')`,
          [market_id, entrepreneurs_id, shop_name, description || '', image_url || null],
          (shopErr, shopResult) => {
            if (shopErr) console.error('⚠️ Could not create tbl_shops record:', shopErr.message);
            else console.log('✅ tbl_shops record created, shop_id:', shopResult.insertId);

            db.query('UPDATE tbl_users SET role = ? WHERE user_id = ?', ['Entrepreneur', user_id], (roleErr) => {
              if (roleErr) console.error('Error updating user role:', roleErr);
              res.json({
                message: 'เพิ่มร้านค้าสำเร็จ',
                entrepreneurs_id,
                shop_id: shopResult?.insertId || null,
              });
            });
          }
        );
      });
    }
  );
    }
  );
});

// MUST be before /entrepreneur/:user_id to avoid route shadowing
app.get('/entrepreneur/my-shops', verifyToken, (req, res) => {
  const user_id = req.user_id;
  const sql = `
    SELECT s.shop_id, s.market_id, s.image_url, s.status,
           COALESCE(s.shop_name, e.shop_name) AS shop_name, e.category, e.open_time, e.close_time, e.phone_number,
           e.entrepreneurs_id,
           fm.name AS market_name,
           (SELECT COUNT(*) FROM tbl_products p WHERE p.shop_id = s.shop_id) AS product_count,
           (SELECT COUNT(*) FROM tbl_orders o WHERE o.shop_id = s.shop_id AND o.status IN ('AwaitingPayment','Pending')) AS pending_count
    FROM tbl_shops s
    JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
    JOIN tbl_floating_markets fm ON s.market_id = fm.market_id
    WHERE e.user_id = ?
  `;
  db.query(sql, [user_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get entrepreneur/shop by user_id
app.get('/entrepreneur/:user_id', (req, res) => {
  const { user_id } = req.params;
  const sql = `SELECT e.*, s.shop_id, COALESCE(s.shop_name, e.shop_name) AS shop_name
               FROM tbl_entrepreneurs e
               LEFT JOIN tbl_shops s ON e.entrepreneurs_id = s.entrepreneur_id
               WHERE e.user_id = ? LIMIT 1`;
  db.query(sql, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!results || results.length === 0) return res.status(200).json(null);
    res.json(results[0]);
  });
});

// Get my shop (for EditShop) - join tbl_shops to include shop_id and image_url
app.get('/my-shop', verifyToken, (req, res) => {
  const user_id = req.user_id;
  const { shop_id } = req.query;
  const params = shop_id ? [user_id, shop_id] : [user_id];
  const sql = `
    SELECT e.*,
           s.shop_id,
           COALESCE(s.shop_name, e.shop_name) AS shop_name,
           s.image_url,
           s.status AS shop_status
    FROM tbl_entrepreneurs e
    LEFT JOIN tbl_shops s ON e.entrepreneurs_id = s.entrepreneur_id
    WHERE e.user_id = ?
    ${shop_id ? 'AND s.shop_id = ?' : ''}
    LIMIT 1
  `;
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'shop not found' });
    }
    res.json(results[0]);
  });
});

// Toggle shop open/close status
app.put('/entrepreneur/shop-status/:shop_id', verifyToken, express.json(), (req, res) => {
  const user_id = req.user_id;
  const { shop_id } = req.params;
  const verifySql = `
    SELECT s.shop_id, s.status FROM tbl_shops s
    JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
    WHERE s.shop_id = ? AND e.user_id = ?
    LIMIT 1
  `;
  db.query(verifySql, [shop_id, user_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(403).json({ error: 'ไม่มีสิทธิ์เปลี่ยนสถานะร้านนี้' });
    const newStatus = rows[0].status === 'Open' ? 'Closed' : 'Open';
    db.query('UPDATE tbl_shops SET status = ? WHERE shop_id = ?', [newStatus, shop_id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ shop_id: Number(shop_id), status: newStatus });
    });
  });
});

// Edit my shop (for EditShop)
app.post('/edit-shop', verifyToken, (req, res) => {
  const user_id = req.user_id;
  const { shop_name, description, phone_number, location, image_url, shop_id } = req.body;

  if (!shop_name || !phone_number) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อร้านและเบอร์โทร' });
  }

  // ดึงชื่อปัจจุบันก่อน แล้วเช็ค duplicate เฉพาะเมื่อชื่อเปลี่ยน
  const curNameSql = shop_id
    ? `SELECT COALESCE(s.shop_name, e.shop_name) AS cur_name FROM tbl_shops s JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id WHERE s.shop_id = ? AND e.user_id = ? LIMIT 1`
    : null;

  const runDupCheck = (skipDup) => {
    if (skipDup) return doUpdate();
    db.query(
      `SELECT COUNT(*) AS cnt FROM tbl_shops s
       LEFT JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
       WHERE COALESCE(s.shop_name, e.shop_name) = ? AND s.shop_id != ?`,
      [shop_name.trim(), shop_id || 0],
      (dupErr, dupRows) => {
        if (dupErr) return res.status(500).json({ error: 'Database error' });
        if (dupRows[0].cnt > 0) return res.status(409).json({ error: `ชื่อร้านค้า "${shop_name}" มีอยู่แล้วในระบบ กรุณาใช้ชื่ออื่น` });
        doUpdate();
      }
    );
  };

  if (curNameSql) {
    db.query(curNameSql, [shop_id, user_id], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      const currentName = rows[0]?.cur_name || '';
      // ถ้าชื่อไม่เปลี่ยน ข้าม duplicate check
      runDupCheck(currentName.trim() === shop_name.trim());
    });
  } else {
    runDupCheck(false);
  }

  function ensureShopNameColumn(cb) {
    db.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_shops' AND COLUMN_NAME = 'shop_name'`,
      (err, rows) => {
        if (err || (rows && rows[0].cnt > 0)) return cb();
        db.query(`ALTER TABLE tbl_shops ADD COLUMN shop_name VARCHAR(255) NULL DEFAULT NULL`, (alterErr) => {
          if (alterErr && alterErr.code !== 'ER_DUP_FIELDNAME') console.error('alter error:', alterErr.message);
          db.query(
            `UPDATE tbl_shops s JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
             SET s.shop_name = e.shop_name WHERE s.shop_name IS NULL`,
            (backfillErr) => { if (backfillErr) console.error('backfill error:', backfillErr.message); cb(); }
          );
        });
      }
    );
  }

  function doUpdate() {
    const entreUpdates = ['description=?', 'phone_number=?', 'location=?'];
    const entreParams  = [description || '', phone_number, location || '', user_id];
    db.query(`UPDATE tbl_entrepreneurs SET ${entreUpdates.join(',')} WHERE user_id=?`, entreParams, (err, result) => {
      if (err) { console.error(err); return res.status(500).json({ error: 'Database error' }); }
      if (result.affectedRows === 0) return res.status(404).json({ error: 'ไม่พบข้อมูลร้านค้า' });
      if (!shop_id) return res.json({ message: 'อัปเดตร้านค้าสำเร็จ' });

      ensureShopNameColumn(() => {
        const shopFields = [];
        const shopParams = [];
        if (shop_name !== undefined) { shopFields.push('s.shop_name = ?'); shopParams.push(shop_name); }
        if (image_url !== undefined) { shopFields.push('s.image_url = ?'); shopParams.push(image_url); }

        if (!shopFields.length) return res.json({ message: 'อัปเดตร้านค้าสำเร็จ' });

        shopParams.push(shop_id, user_id);
        db.query(
          `UPDATE tbl_shops s
           JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
           SET ${shopFields.join(', ')}
           WHERE s.shop_id = ? AND e.user_id = ?`,
          shopParams,
          (err2) => {
            if (err2) return res.status(500).json({ error: 'บันทึกชื่อร้านไม่สำเร็จ: ' + err2.message });
            res.json({ message: 'อัปเดตร้านค้าสำเร็จ' });
          }
        );
      });
    });
  }
});

// ============================================================
// SHOP ORDER MANAGEMENT — จัดการออเดอร์ฝั่งเจ้าของร้าน
//   GET /shop-orders/:shop_id          ดึงออเดอร์ทั้งหมดในร้าน (เจ้าของร้านเท่านั้น)
//   GET /shop-sales/:shop_id           ยอดขายรายวัน/รายเดือน (chart ใน dashboard)
// ============================================================

// Get all orders for a shop (with customer, product, quantity) - from payment system
// Updated: Add token verification and check if user is the shop owner
app.get('/shop-orders/:shop_id', verifyToken, (req, res) => {
  const { shop_id } = req.params;
  const user_id  = req.user_id;
  const userRole = req.role;

  // Admin ข้ามการเช็ค ownership ได้เลย
  const ownerCheck = userRole === 'Admin'
    ? Promise.resolve()
    : new Promise((resolve, reject) => {
        db.query(
          `SELECT s.shop_id FROM tbl_shops s
           JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
           WHERE s.shop_id = ? AND e.user_id = ? LIMIT 1`,
          [shop_id, user_id],
          (err, rows) => {
            if (err) return reject(err);
            if (!rows || rows.length === 0) return reject({ status: 403, message: 'คุณไม่ใช่เจ้าของร้านนี้' });
            resolve();
          }
        );
      });

  ownerCheck
    .then(() => {
      // User is authorized, fetch orders
      const sql = `
        SELECT
          o.order_id,
          TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS customer_name,
          u.phone AS customer_phone,
          p.name AS product_name,
          oi.quantity,
          oi.price,
          o.status,
          o.payment_method,
          o.total_amount,
          o.created_at,
          o.shipping_address,
          o.notes,
          COALESCE(s.shop_name, e.shop_name) AS shop_name,
          s.market_id,
          fm.name AS market_name
        FROM tbl_orders o
        LEFT JOIN tbl_order_details oi ON o.order_id = oi.order_id
        LEFT JOIN tbl_products p ON oi.product_id = p.product_id
        LEFT JOIN tbl_users u ON o.tourist_id = u.user_id
        LEFT JOIN tbl_shops s ON o.shop_id = s.shop_id
        LEFT JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
        LEFT JOIN tbl_floating_markets fm ON s.market_id = fm.market_id
        WHERE o.shop_id = ?
        ORDER BY o.created_at DESC
      `;
      db.query(sql, [shop_id], (err, results) => {
        if (err) {
          console.error('❌ Query error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(results || []);
      });
    })
    .catch(e => {
      if (e && e.status) return res.status(e.status).json({ error: e.message });
      return res.status(500).json({ error: e?.message || 'Database error' });
    });
});


// ...existing code...

// Get shop info by shop_id (for ShopProfile)
app.get('/entrepreneur-by-shop/:shop_id', (req, res) => {
  const { shop_id } = req.params;
  const sql = `SELECT s.*, COALESCE(s.shop_name, e.shop_name) AS shop_name, e.phone_number, e.description, e.location, e.open_time, e.close_time, fm.name as market_name
               FROM tbl_shops s
               LEFT JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
               LEFT JOIN tbl_floating_markets fm ON s.market_id = fm.market_id
               WHERE s.shop_id = ? LIMIT 1`;
  db.query(sql, [shop_id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลร้านค้าด้วย shop_id นี้' });
    }
    res.json(results[0]);
  });
});

// GET /shop-sales/:shop_id?year=YYYY&month=MM — ยอดขายรายเดือน
app.get('/shop-sales/:shop_id', verifyToken, async (req, res) => {
  const { shop_id } = req.params;
  const user_id = req.user_id;
  const now = new Date();
  const year  = parseInt(req.query.year  || now.getFullYear());
  const month = parseInt(req.query.month || now.getMonth() + 1);

  try {
    // ตรวจ ownership (admin ข้ามได้)
    if (req.role !== 'Admin') {
      const owned = await queryAsync(
        `SELECT s.shop_id FROM tbl_shops s
         JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
         WHERE s.shop_id = ? AND e.user_id = ? LIMIT 1`,
        [shop_id, user_id]
      );
      if (!owned.length) return res.status(403).json({ error: 'ไม่ใช่เจ้าของร้านนี้' });
    }

    // ยอดขายรายวันในเดือนนั้น (เฉพาะ Completed)
    const daily = await queryAsync(
      `SELECT DAY(created_at) AS day,
              COUNT(*)          AS order_count,
              SUM(total_amount) AS total_sales
       FROM tbl_orders
       WHERE shop_id = ? AND YEAR(created_at) = ? AND MONTH(created_at) = ?
         AND status = 'Completed'
       GROUP BY DAY(created_at)
       ORDER BY day`,
      [shop_id, year, month]
    );

    // สรุปเดือน
    const summary = await queryAsync(
      `SELECT COUNT(CASE WHEN status='Completed' THEN 1 END)                        AS order_count,
              COALESCE(SUM(CASE WHEN status='Completed' THEN total_amount END), 0)  AS total_sales,
              COALESCE(MAX(CASE WHEN status='Completed' THEN total_amount END), 0)  AS max_order,
              COALESCE(AVG(CASE WHEN status='Completed' THEN total_amount END), 0)  AS avg_order,
              COUNT(CASE WHEN status='Cancelled' THEN 1 END)                        AS cancelled_count
       FROM tbl_orders
       WHERE shop_id = ? AND YEAR(created_at) = ? AND MONTH(created_at) = ?`,
      [shop_id, year, month]
    );

    // รายการออเดอร์ในเดือนนี้
    const orders = await queryAsync(
      `SELECT o.order_id, o.total_amount, o.created_at, o.payment_method,
              CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) AS customer_name
       FROM tbl_orders o
       LEFT JOIN tbl_users u ON o.tourist_id = u.user_id
       WHERE o.shop_id = ? AND YEAR(o.created_at) = ? AND MONTH(o.created_at) = ?
         AND o.status = 'Completed'
       ORDER BY o.created_at DESC
       LIMIT 100`,
      [shop_id, year, month]
    );

    res.json({ daily, summary: summary[0], orders, year, month });
  } catch (err) {
    console.error('shop-sales error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// REVIEW ROUTES — รีวิวตลาด, ร้านค้า, สินค้า
//   GET/POST /market-reviews/:id    รีวิวตลาดน้ำ
//   GET/POST /shop-reviews/:id      รีวิวร้านค้า
//   GET/POST /product-reviews/:id   รีวิวสินค้า
// ============================================================

// Get reviews for a floating market (MySQL)
app.get('/market-reviews/:market_id', (req, res) => {
  const { market_id } = req.params;
  console.log('📝 GET /market-reviews/:market_id - market_id:', market_id);
  const sql = 'SELECT * FROM tbl_market_reviews WHERE market_id = ? ORDER BY created_at DESC';
  db.query(sql, [market_id], (err, results) => {
    if (err) {
      console.error('❌ Error fetching market reviews:', err);
      // If table doesn't exist, return empty array instead of error
      if (err.code === 'ER_NO_SUCH_TABLE') {
        console.log('⚠️ Table tbl_market_reviews does not exist');
        return res.json([]);
      }
      return res.status(500).json({ error: 'DB error', detail: err.message });
    }
    console.log('✅ Market reviews found:', results?.length || 0);
    res.json(results || []);
  });
});

// Test route for market
app.get('/test-market', (req, res) => {
  console.log('🧪 GET /test-market - Running database health check');
  
  // ตรวจสอบตาราง
  const checks = {};
  
  // Check 1: tbl_floating_markets
  db.query('SELECT COUNT(*) as count FROM tbl_floating_markets', (err, results) => {
    if (err) {
      checks.floating_markets = { status: '❌ ERROR', error: err.message };
    } else {
      checks.floating_markets = { status: '✅ OK', records: results[0].count };
    }
    
    // Check 2: tbl_shops
    db.query('SELECT COUNT(*) as count FROM tbl_shops', (err, results) => {
      if (err) {
        checks.shops = { status: '❌ ERROR', error: err.message };
      } else {
        checks.shops = { status: '✅ OK', records: results[0].count };
      }
      
      // Check 3: tbl_products
      db.query('SELECT COUNT(*) as count FROM tbl_products', (err, results) => {
        if (err) {
          checks.products = { status: '❌ ERROR', error: err.message };
        } else {
          checks.products = { status: '✅ OK', records: results[0].count };
        }
        
        // Check 4: tbl_market_reviews
        db.query('SELECT COUNT(*) as count FROM tbl_market_reviews', (err, results) => {
          if (err) {
            checks.market_reviews = { status: '❌ ERROR (Table may not exist)', error: err.message };
          } else {
            checks.market_reviews = { status: '✅ OK', records: results[0].count };
          }
          
          res.json({
            database: 'floating_LongLoy',
            connection: '✅ Connected',
            tables: checks
          });
        });
      });
    });
  });
});

// Add a review for a floating market (MySQL) - require login, use user_id as tourist_id
app.post('/market-reviews/:market_id', verifyToken, express.json(), (req, res) => {
  const { market_id } = req.params;
  const { reviewer_name, rating, comment } = req.body;
  const tourist_id = req.user_id; // user_id from token
  if (!reviewer_name || !rating || !comment) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const sql = 'INSERT INTO tbl_market_reviews (tourist_id, market_id, reviewer_name, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
  db.query(sql, [tourist_id, market_id, reviewer_name, rating, comment], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});

// Get reviews for a shop (MySQL)
app.get('/shop-reviews/:shop_id', (req, res) => {
  const { shop_id } = req.params;
  const sql = 'SELECT * FROM tbl_shop_reviews WHERE shop_id = ? ORDER BY created_at DESC';
  db.query(sql, [shop_id], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    // Return empty array if no reviews instead of 404
    res.json(Array.isArray(results) ? results : []);


  });
});

// Get reviews for a product (MySQL)
app.get('/product-reviews/:product_id', (req, res) => {
  const { product_id } = req.params;
  const sql = 'SELECT * FROM tbl_product_reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 10';
  db.query(sql, [product_id], (err, results) => {
    if (err) {
      // If table doesn't exist, just return empty array
      if (err.code === 'ER_NO_SUCH_TABLE') {
        return res.json([]);
      }
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(Array.isArray(results) ? results : []);
  });
});

// Add a review for a product
app.post('/product-reviews/:product_id', express.json(), (req, res) => {
  const { product_id } = req.params;
  const { reviewer_name, rating, comment } = req.body;
  if (!reviewer_name || !rating || !comment) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  // Check if table exists first
  const sql = 'INSERT INTO tbl_product_reviews (product_id, reviewer_name, rating, comment, created_at) VALUES (?, ?, ?, ?, NOW())';
  db.query(sql, [product_id, reviewer_name, rating, comment], (err, result) => {
    if (err) {
      // If table doesn't exist, just return success (mock)
      if (err.code === 'ER_NO_SUCH_TABLE') {
        return res.json({ success: true, message: 'Reviews table not yet created' });
      }
      return res.status(500).json({ error: 'DB error' });
    }
    res.json({ success: true });
  });
});

// Add a review for a shop
app.post('/shop-reviews/:shop_id', express.json(), (req, res) => {
  const { shop_id } = req.params;
  const { reviewer_name, rating, comment } = req.body;
  if (!reviewer_name || !rating || !comment) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const sql = 'INSERT INTO tbl_shop_reviews (shop_id, reviewer_name, rating, comment, created_at) VALUES (?, ?, ?, ?, NOW())';
  db.query(sql, [shop_id, reviewer_name, rating, comment], (err, result) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});



// ============================================================
// POINTS & STEP COUNTER ROUTES — แต้มสะสมและการนับก้าวเดิน
//   POST /user/add-points               เพิ่มแต้มให้ user (legacy)
//   POST /user/save-steps               บันทึกจำนวนก้าวลง user_steps
//   GET  /user/step-history             ประวัติก้าวย้อนหลัง 30 วัน
//   GET  /user/daily-step-reward        ตรวจว่ารับ reward วันนี้แล้วหรือยัง
//   POST /user/claim-daily-steps-reward claim 100 แต้มเมื่อเดิน 5,000 ก้าว/วัน
//   POST /user/steps                    บันทึก+ให้แต้มทันทีถ้าถึงเป้า (legacy)
//   POST /user/sync-google-fit          sync ก้าวจาก Google Fit API
// ============================================================

// เพิ่มแต้มให้ user (ต้อง login)
app.post('/user/add-points', verifyToken, (req, res) => {
  const user_id = req.user_id;
  const { points } = req.body;
  if (!points || isNaN(points)) {
    return res.status(400).json({ error: 'กรุณาระบุจำนวนแต้มที่ถูกต้อง' });
  }
  // หา tourist_id จาก user_id
  const getTouristSql = 'SELECT tourist_id, current_points FROM tbl_tourists WHERE user_id = ? LIMIT 1';
  db.query(getTouristSql, [user_id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูล tourist ของ user นี้' });
    }
    const tourist_id = rows[0].tourist_id;
    const newPoints = (rows[0].current_points || 0) + Number(points);
    const updateSql = 'UPDATE tbl_tourists SET current_points = ? WHERE tourist_id = ?';
    db.query(updateSql, [newPoints, tourist_id], (err2) => {
      if (err2) return res.status(500).json({ error: 'Update points failed' });
      res.json({ success: true, points: newPoints });
    });
  });
});

// Save step count to database
app.post('/user/save-steps', verifyToken, (req, res) => {
  const user_id = req.user_id;
  const { steps, date } = req.body;
  
  if (!steps || isNaN(steps)) {
    return res.status(400).json({ error: 'Invalid steps value' });
  }
  
  const stepDate = date || new Date().toISOString().split('T')[0];
  
  // Insert or update step count
  const sql = `INSERT INTO user_steps (user_id, step_count, step_date, created_at, updated_at) 
               VALUES (?, ?, ?, NOW(), NOW())
               ON DUPLICATE KEY UPDATE step_count = ?, updated_at = NOW()`;
  
  db.query(sql, [user_id, steps, stepDate, steps], (err, result) => {
    if (err) {
      console.error('Save steps error:', err);
      return res.status(500).json({ error: 'Failed to save steps' });
    }
    res.json({ success: true, message: 'Steps saved' });
  });
});

// Get step history for user (last 30 days)
app.get('/user/step-history', verifyToken, (req, res) => {
  const user_id = req.user_id;
  
  const sql = `SELECT step_date, step_count, reward_claimed, reward_points 
               FROM user_steps 
               WHERE user_id = ? 
               ORDER BY step_date DESC 
               LIMIT 30`;
  
  db.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error('Get step history error:', err);
      return res.status(500).json({ error: 'Failed to get step history' });
    }
    res.json(results || []);
  });
});

// ตรวจสอบว่า user ได้รับ reward ของการนับก้าวในวันนี้หรือไม่
app.get('/user/daily-step-reward', verifyToken, (req, res) => {
  const user_id = req.user_id;
  
  // ตรวจสอบว่ามี record ของวันนี้และ rewarded = true หรือไม่
  const checkSql = `SELECT rewarded FROM user_daily_steps WHERE user_id = ? AND date = CURDATE()`;
  db.query(checkSql, [user_id], (err, results) => {
    if (err) {
      console.error('DAILY STEP REWARD CHECK ERROR:', err);
      return res.status(500).json({
        error: 'Database error',
        detail: err.sqlMessage || err.message
      });
    }
    const rewarded = results && results.length > 0 && results[0].rewarded === 1;
    res.json({ rewarded });
  });
});

// Claim daily step reward
app.post('/user/claim-daily-steps-reward', verifyToken, (req, res) => {
  const user_id = req.user_id;
  const { steps } = req.body;
  const STEP_GOAL = 5000;
  const POINTS_REWARD = 100;
  
  if (!steps || isNaN(steps)) {
    return res.status(400).json({ error: 'กรุณาระบุจำนวนก้าวที่ถูกต้อง', success: false });
  }
  
  // ตรวจสอบว่ามี reward ของวันนี้แล้วหรือไม่
  const checkSql = `SELECT rewarded, points_earned FROM user_daily_steps WHERE user_id = ? AND date = CURDATE()`;
  db.query(checkSql, [user_id], (err, checkResults) => {
    if (err) {
      console.error('CLAIM STEP REWARD CHECK ERROR:', err);
      return res.status(500).json({
        error: 'Database error',
        detail: err.sqlMessage || err.message,
        success: false
      });
    }
    
    if (checkResults && checkResults.length > 0 && checkResults[0].rewarded === 1) {
      return res.status(400).json({ 
        error: 'คุณได้รับรางวัลสำหรับวันนี้แล้ว', 
        success: false 
      });
    }
    
    // ถ้ายังไม่มี record วันนี้ สร้างใหม่
    if (!checkResults || checkResults.length === 0) {
      const insertSql = `INSERT INTO user_daily_steps (user_id, date, total_steps, points_earned, rewarded) 
                        VALUES (?, CURDATE(), ?, ?, TRUE)
                        ON DUPLICATE KEY UPDATE 
                        total_steps = VALUES(total_steps), 
                        points_earned = ?, 
                        rewarded = TRUE`;
      db.query(insertSql, [user_id, Number(steps), POINTS_REWARD, POINTS_REWARD], (err2) => {
        if (err2) {
          console.error('INSERT DAILY STEP ERROR:', err2);
          return res.status(500).json({
            error: 'Database error',
            detail: err2.sqlMessage || err2.message,
            success: false
          });
        }
        
        // เพิ่มแต้มให้ user (ใน tbl_users)
        const getPointsSql = 'SELECT current_points FROM tbl_users WHERE user_id = ?';
        db.query(getPointsSql, [user_id], (err3, userRows) => {
          if (err3 || !userRows || userRows.length === 0) {
            return res.status(500).json({ error: 'User not found', success: false });
          }
          
          const currentPoints = userRows[0].current_points || 0;
          const newPoints = currentPoints + POINTS_REWARD;
          const updatePointsSql = 'UPDATE tbl_users SET current_points = ?, points_expiry_date = DATE_ADD(NOW(), INTERVAL 4 YEAR) WHERE user_id = ?';
          db.query(updatePointsSql, [newPoints, user_id], (err4) => {
            if (err4) return res.status(500).json({ error: 'Update points failed', success: false });
            
            // Log the redeem activity (admin_id = 0 for system/user action)
            logAdminActivity(0, user_id, 'redeem_points', `แลกแต้มจากการเดินเท้า`, currentPoints.toString(), newPoints.toString());
            
            res.json({ 
              success: true, 
              message: 'ได้รับรางวัลสำเร็จ',
              reward: POINTS_REWARD,
              points: newPoints 
            });
          });
        });
      });
    } else {
      // มี record แล้วแต่ยังไม่ได้ reward ให้อัปเดตเป็น rewarded = true
      const updateSql = `UPDATE user_daily_steps SET rewarded = TRUE, points_earned = ? 
                        WHERE user_id = ? AND date = CURDATE()`;
      db.query(updateSql, [POINTS_REWARD, user_id], (err2) => {
        if (err2) {
          console.error('UPDATE DAILY STEP ERROR:', err2);
          return res.status(500).json({
            error: 'Database error',
            detail: err2.sqlMessage || err2.message,
            success: false
          });
        }
        
        // เพิ่มแต้มให้ user (ใน tbl_users)
        const getPointsSql = 'SELECT current_points FROM tbl_users WHERE user_id = ?';
        db.query(getPointsSql, [user_id], (err3, userRows) => {
          if (err3 || !userRows || userRows.length === 0) {
            return res.status(500).json({ error: 'User not found', success: false });
          }
          
          const currentPoints = userRows[0].current_points || 0;
          const newPoints = currentPoints + POINTS_REWARD;
          const updatePointsSql = 'UPDATE tbl_users SET current_points = ?, points_expiry_date = DATE_ADD(NOW(), INTERVAL 4 YEAR) WHERE user_id = ?';
          db.query(updatePointsSql, [newPoints, user_id], (err4) => {
            if (err4) return res.status(500).json({ error: 'Update points failed', success: false });
            res.json({ 
              success: true, 
              message: 'ได้รับรางวัลสำเร็จ',
              reward: POINTS_REWARD,
              points: newPoints 
            });
          });
        });
      });
    }
  });
});

// ============================================================
// CART ROUTES — ตะกร้าสินค้า
//   POST /cart/add   รับ cartItems จาก frontend แล้ว sync ไว้ใน DB
//                    (ปัจจุบัน backend แค่ log ไว้ ตะกร้าจริงอยู่ใน localStorage)
// ============================================================

// Sync cart to backend
app.post('/cart/add', verifyToken, (req, res) => {
  const user_id = req.user_id;
  const { cartItems = [] } = req.body;
  
  // บันทึก cart ลงในฐานข้อมูลถ้าต้องการ (ตอนนี้แค่ return 200)
  console.log('📦 Cart synced for user:', user_id, 'items:', cartItems.length);
  res.json({ success: true, message: 'Cart synced' });
});

// ============================================================
// PAYMENT ROUTES — การชำระเงินผ่าน Omise
//   GET  /payments/token                ดึง Omise Public Key ให้ frontend tokenize บัตร
//   POST /orders/checkout               สร้าง order + คำนวณยอด + ใช้คูปอง
//   POST /payments/create-charge        ส่งบัตรไปชาร์จผ่าน Omise API
//   GET  /orders/:id                    ดึงรายละเอียดออเดอร์ (buyer เท่านั้น)
//   GET  /user-orders                   ประวัติออเดอร์ทั้งหมดของ user
//   POST /orders/:id/cancel             ยกเลิกออเดอร์ (buyer)
//   PUT  /orders/:id/status             อัปเดตสถานะออเดอร์ (เจ้าของร้าน)
//   POST /orders/:id/confirm-payment    เจ้าของร้านยืนยันรับเงินสด → เปลี่ยนเป็น Cooking
//   POST /webhooks/omise                webhook รับ notification จาก Omise
//
// queryAsync — helper แปลง db.query callback เป็น Promise สำหรับ async/await
// ============================================================

// Get Omise public key for frontend
app.get('/payments/token', (req, res) => {
  res.json({ publicKey: OMISE_PUBLIC_KEY });
});

// Create order and prepare for payment
// Promisify db.query for async/await
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

app.post('/orders/checkout', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  const { shop_id, address = '', note = '', coupon_code = '', payment_method = 'card', redeem_id = null } = req.body;

  console.log('=== CHECKOUT START ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('user_id:', user_id, 'shop_id:', shop_id);

  try {
    // Get cart items from request
    const { cartItems = [] } = req.body;
    
    console.log('cartItems received:', JSON.stringify(cartItems, null, 2));
    console.log('cartItems.length:', cartItems.length);
    
    if (!cartItems || cartItems.length === 0) {
      console.error('❌ VALIDATION FAILED: cartItems is empty');
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Get user info from tbl_users
    const userSql = 'SELECT email, phone, first_name, last_name FROM tbl_users WHERE user_id = ?';
    let userResult;
    try {
      userResult = await queryAsync(userSql, [user_id]);
    } catch (err) {
      console.error('User query error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult[0];
    console.log('User found:', user.email);

    // Get tourist_id from tbl_tourists that corresponds to this user_id
    const touristSql = 'SELECT tourist_id FROM tbl_tourists WHERE user_id = ?';
    let touristResult;
    try {
      touristResult = await queryAsync(touristSql, [user_id]);
    } catch (err) {
      console.error('Tourist query error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    let tourist_id = null;
    if (touristResult && touristResult.length > 0) {
      tourist_id = touristResult[0].tourist_id;
      console.log('Tourist found, tourist_id:', tourist_id);
    } else {
      console.warn('No tourist record found for user_id:', user_id, ' - creating new tourist record');
      // Create a tourist record if it doesn't exist
      const full_name = `${user.first_name} ${user.last_name}`;
      const createTouristSql = 'INSERT INTO tbl_tourists (user_id, full_name) VALUES (?, ?)';
      try {
        const touristInsertResult = await queryAsync(createTouristSql, [user_id, full_name]);
        tourist_id = touristInsertResult.insertId;
        console.log('Tourist record created, tourist_id:', tourist_id, 'full_name:', full_name);
      } catch (err) {
        console.error('Tourist creation error:', err);
        return res.status(500).json({ error: 'Failed to create tourist record' });
      }
    }

    // Calculate total amount
    let amount = cartItems.reduce((total, item) => {
      return total + (parseFloat(item.price || 0) * parseInt(item.qty || item.quantity || 0));
    }, 0);

    console.log('Calculated amount (baht):', amount);

    if (amount <= 0) {
      return res.status(400).json({ error: 'ยอดรวมสินค้าต้องมากกว่า 0' });
    }

    // Apply coupon discount if provided (validate by redeem_id first, fallback to coupon_code)
    let couponDiscount = 0;
    let appliedRedeemId = redeem_id || null;
    if (redeem_id || (coupon_code && coupon_code.trim())) {
      try {
        let reward = null;
        if (redeem_id) {
          // Validate this specific coupon instance
          const rows = await queryAsync(
            `SELECT r.discount_amount, r.points_required, r.coupon_code
             FROM tbl_redemption_history rh
             JOIN tbl_rewards r ON rh.reward_id = r.reward_id
             LEFT JOIN tbl_tourists t ON rh.tourist_id = t.tourist_id
             LEFT JOIN tbl_coupon_usage cu ON cu.redeem_id = rh.redeem_id
             WHERE rh.redeem_id = ? AND (t.user_id = ? OR rh.tourist_id = ?) AND cu.usage_id IS NULL`,
            [redeem_id, user_id, user_id]
          );
          if (rows?.length) reward = rows[0];
        } else if (coupon_code && coupon_code.trim()) {
          // Find first unused instance for this user
          const rows = await queryAsync(
            `SELECT rh.redeem_id, r.discount_amount, r.points_required
             FROM tbl_redemption_history rh
             JOIN tbl_rewards r ON rh.reward_id = r.reward_id
             LEFT JOIN tbl_tourists t ON rh.tourist_id = t.tourist_id
             LEFT JOIN tbl_coupon_usage cu ON cu.redeem_id = rh.redeem_id
             WHERE r.coupon_code = ? AND (t.user_id = ? OR rh.tourist_id = ?) AND cu.usage_id IS NULL
             ORDER BY rh.redeem_id ASC LIMIT 1`,
            [coupon_code.trim(), user_id, user_id]
          );
          if (rows?.length) { reward = rows[0]; appliedRedeemId = rows[0].redeem_id; }
        }
        if (reward) {
          couponDiscount = reward.discount_amount || reward.points_required || 0;
          amount = Math.max(20, amount - couponDiscount);
          console.log(`✅ Coupon applied (redeem_id=${appliedRedeemId}): -฿${couponDiscount}, new amount ฿${amount}`);
        }
      } catch (couponErr) {
        console.log('Coupon apply error (non-fatal):', couponErr.message);
      }
    }

    // Convert to satang for Omise
    const amountInSatang = Math.round(amount * 100);
    console.log('Amount in satang:', amountInSatang);

    // Create order record in database
    const initialStatus = payment_method === 'cash' ? 'Cooking' : 'AwaitingPayment';
    const orderSql = `
      INSERT INTO tbl_orders (user_id, tourist_id, shop_id, total_amount, status, payment_method)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    let orderResult;
    try {
      console.log('Inserting order:', { user_id, tourist_id, shop_id, amount, payment_method });
      orderResult = await queryAsync(orderSql, [user_id, tourist_id, shop_id, amount, initialStatus, payment_method]);
      console.log('✅ Order created with ID:', orderResult.insertId);
    } catch (err) {
      console.error('❌ Order creation error:', err.message);
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        if (err.sqlMessage?.includes('tbl_shops')) {
          return res.status(400).json({ error: 'ไม่พบร้านค้านี้' });
        }
        return res.status(400).json({ error: 'ข้อมูลอ้างอิงไม่ถูกต้อง: ' + err.message });
      }
      return res.status(500).json({ error: 'ไม่สามารถสร้างคำสั่งซื้อได้: ' + err.message });
    }

    const order_id = orderResult.insertId;

    // Record coupon usage (per redeem_id, not per coupon_code)
    if (appliedRedeemId && couponDiscount > 0) {
      db.query(
        'INSERT INTO tbl_coupon_usage (user_id, coupon_code, redeem_id, order_id, discount_amount) VALUES (?, ?, ?, ?, ?)',
        [user_id, coupon_code?.trim() || '', appliedRedeemId, order_id, couponDiscount],
        (err) => {
          if (err) console.log('Note: Could not record coupon usage:', err.message);
          else console.log(`✅ Coupon usage recorded: user ${user_id}, redeem_id ${appliedRedeemId}, order ${order_id}`);
        }
      );
    }

    // Insert order items into tbl_order_details
    const orderItemsSql = 'INSERT INTO tbl_order_details (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)';
    
    try {
      for (const item of cartItems) {
        console.log('Inserting item:', { order_id, product_id: item.product_id, qty: item.qty, price: item.price });
        await queryAsync(orderItemsSql, [order_id, item.product_id, item.qty, item.price]);
      }
    } catch (err) {
      console.error('Order item insert error:', err);
      // Still return success since order was created, items might have been partially inserted
    }

    const response = {
      success: true,
      order_id: order_id,
      amount: amountInSatang,
      email: user.email,
      phone: user.phone,
      fullName: `${user.first_name} ${user.last_name}`,
      publicKey: OMISE_PUBLIC_KEY,
      couponDiscount: couponDiscount,
      payment_method,
    };
    
    console.log('=== CHECKOUT SUCCESS ===');
    console.log('Response:', response);
    
    return res.json(response);
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Checkout failed: ' + error.message });
  }
});

// Create charge with Omise
app.post('/payments/create-charge', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  const { order_id, token, amount } = req.body;

  console.log('=== CREATE CHARGE START ===');
  console.log('Input:', { user_id, order_id, token, amount });

  if (!token || !order_id || !amount) {
    console.error('Missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get order details
    const orderSql = 'SELECT * FROM tbl_orders WHERE order_id = ?';
    console.log('Fetching order:', order_id);
    const orderResult = await queryAsync(orderSql, [order_id]);
    
    console.log('Order query result:', orderResult);
    
    if (!orderResult || orderResult.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult[0];
    console.log('Order found:', order);

    // Create charge with Omise API
    const chargeData = {
      amount: amount, // already in satang
      currency: 'THB',
      customer_email: req.body.email || 'customer@longloy.com',
      card: token,
      description: `Order #${order_id} - LongLoy Shop`
    };

    console.log('Creating Omise charge with data:', chargeData);
    const charge = await makeOmiseRequest('POST', '/charges', chargeData);
    
    console.log('Omise charge response:', charge);

    if (charge.object !== 'charge') {
      console.error('Unexpected Omise response:', charge);
      return res.status(500).json({ error: 'Invalid payment response: ' + JSON.stringify(charge) });
    }

    // Update order status based on charge status
    const chargeStatus = charge.status;
    const orderStatus = chargeStatus === 'successful' ? 'completed' : chargeStatus === 'pending' ? 'pending' : 'cancelled';
    
    console.log('Updating order status:', { chargeStatus, orderStatus });
    const updateSql = 'UPDATE tbl_orders SET status = ? WHERE order_id = ?';
    await queryAsync(updateSql, [orderStatus, order_id]);

    // Insert payment record into tbl_payment
    // Use amount from request (satang) converted back to baht
    const amountInBaht = Math.round((amount / 100) * 100) / 100;
    
    const paymentSql = `
      INSERT INTO tbl_payment (order_id, amount, paid_at, bank_code, slip_image, status)
      VALUES (?, ?, NOW(), ?, ?, ?)
    `;
    
    console.log('Inserting payment:', {
      order_id,
      amountInBaht,
      bank: charge.payment_method?.bank || 'omise',
      chargeId: charge.id,
      status: chargeStatus === 'successful' ? 'Verified' : 'Pending'
    });
    
    await queryAsync(paymentSql, [
      order_id,
      amountInBaht,
      charge.payment_method?.bank || 'omise',
      charge.id,  // Store full charge ID in slip_image field
      chargeStatus === 'successful' ? 'Verified' : 'Pending'
    ]);
    
    console.log('Payment record inserted successfully');

    // If payment successful, log it (points update handled elsewhere)
    if (chargeStatus === 'successful') {
      console.log(`Payment successful for order ${order_id}, amount: ${order.total_amount}`);
    }

    const paymentResponse = {
      success: chargeStatus === 'successful',
      order_id: order_id,
      charge_id: charge.id,
      status: chargeStatus,
      amount: charge.amount,
      message: chargeStatus === 'successful' ? 'ชำระเงินสำเร็จ' : `Payment ${chargeStatus}`
    };
    
    console.log('=== CREATE CHARGE SUCCESS ===');
    console.log('Response:', paymentResponse);
    
    return res.json(paymentResponse);
  } catch (error) {
    console.error('Create charge error:', error);
    return res.status(500).json({ error: 'Failed to create charge: ' + error.message });
  }
});

// Get order details by order_id
app.get('/orders/:order_id', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  const { order_id } = req.params;

  try {
    // tbl_orders.tourist_id references tbl_tourists.tourist_id (not tbl_users.user_id)
    const orderSql = `
      SELECT o.* FROM tbl_orders o
      LEFT JOIN tbl_tourists t ON o.tourist_id = t.tourist_id
      WHERE o.order_id = ?
        AND (o.user_id = ? OR t.user_id = ? OR o.tourist_id = ?)
    `;
    const orderResult = await queryAsync(orderSql, [order_id, user_id, user_id, user_id]);

    if (!orderResult || orderResult.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult[0];

    // Get order items
    const itemsSql = `
      SELECT oi.product_id, p.name, oi.quantity, oi.price
      FROM tbl_order_details oi
      JOIN tbl_products p ON oi.product_id = p.product_id
      WHERE oi.order_id = ?
    `;
    const itemsResult = await queryAsync(itemsSql, [order_id]);

    return res.json({
      order: order,
      items: itemsResult || []
    });
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({ error: 'Failed to fetch order: ' + error.message });
  }
});

// Get all orders for the logged-in user
app.get('/user-orders', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  console.log('📦 GET /user-orders - user_id:', user_id);

  try {
    const ordersSql = `
      SELECT
        o.order_id,
        o.shop_id,
        o.total_amount,
        o.status,
        o.payment_method,
        o.created_at,
        COALESCE(s.shop_name, e.shop_name) AS shop_name,
        COUNT(oi.order_detail_id) as item_count
      FROM tbl_orders o
      LEFT JOIN tbl_tourists t ON o.tourist_id = t.tourist_id
      LEFT JOIN tbl_shops s ON o.shop_id = s.shop_id
      LEFT JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
      LEFT JOIN tbl_order_details oi ON o.order_id = oi.order_id
      WHERE o.user_id = ?
         OR t.user_id = ?
         OR o.tourist_id = ?
      GROUP BY o.order_id
      ORDER BY o.created_at DESC
    `;
    const ordersResult = await queryAsync(ordersSql, [user_id, user_id, user_id]);
    console.log('✅ Orders retrieved:', ordersResult ? ordersResult.length : 0, 'orders');

    return res.json({
      orders: ordersResult || []
    });
  } catch (error) {
    console.error('❌ Get user orders error:', error);
    return res.status(500).json({ error: 'Failed to fetch orders: ' + error.message });
  }
});

// Cancel order by the buyer (only AwaitingPayment or Cooking+cash before shop processes)
app.post('/orders/:order_id/cancel', verifyToken, async (req, res) => {
  const user_id  = req.user_id;
  const order_id = parseInt(req.params.order_id, 10);
  try {
    const rows = await queryAsync(
      `SELECT o.order_id, o.status, o.payment_method
       FROM tbl_orders o
       LEFT JOIN tbl_tourists t ON o.tourist_id = t.tourist_id
       WHERE o.order_id = ? AND (o.user_id = ? OR t.user_id = ? OR o.tourist_id = ?)`,
      [order_id, user_id, user_id, user_id]
    );
    if (!rows?.length) return res.status(404).json({ error: 'ไม่พบออเดอร์' });
    const order = rows[0];
    const cancellable = ['AwaitingPayment', 'Pending', 'Cooking'].includes(order.status);
    if (!cancellable) return res.status(400).json({ error: `ไม่สามารถยกเลิกออเดอร์ที่มีสถานะ "${order.status}" ได้` });
    await queryAsync('UPDATE tbl_orders SET status = ? WHERE order_id = ?', ['Cancelled', order_id]);
    return res.json({ success: true, message: 'ยกเลิกออเดอร์สำเร็จ' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Update order status (for shop owners) - VERIFIED
app.put('/orders/:order_id/status', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  const order_id = parseInt(req.params.order_id, 10);
  const { status } = req.body;

  console.log('📝 PUT /orders/:order_id/status - user_id:', user_id, 'order_id:', order_id, 'new_status:', status);

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    // Verify user is an entrepreneur
    const ownerCheckSql = 'SELECT entrepreneurs_id FROM tbl_entrepreneurs WHERE user_id = ? LIMIT 1';
    const ownerResult = await queryAsync(ownerCheckSql, [user_id]);
    
    if (!ownerResult || ownerResult.length === 0) {
      console.log('❌ User is not an entrepreneur - user_id:', user_id);
      return res.status(403).json({ error: 'You are not registered as an entrepreneur' });
    }
    
    const entrepreneurId = ownerResult[0].entrepreneurs_id;
    console.log('✓ Entrepreneur verified - entrepreneur_id:', entrepreneurId);

    // Get the order and verify it belongs to this entrepreneur's shop
    const checkSql = `
      SELECT o.order_id, o.shop_id, s.entrepreneur_id
      FROM tbl_orders o
      LEFT JOIN tbl_shops s ON o.shop_id = s.shop_id
      WHERE o.order_id = ?
    `;
    const checkResult = await queryAsync(checkSql, [order_id]);

    if (!checkResult || checkResult.length === 0) {
      console.log('❌ Order not found - order_id:', order_id);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify the order has a valid shop
    if (!checkResult[0].shop_id || !checkResult[0].entrepreneur_id) {
      console.log('❌ Order has no valid shop - order_id:', order_id, 'shop_id:', checkResult[0].shop_id);
      return res.status(400).json({ error: 'Order has no associated shop' });
    }

    // Verify the order belongs to the user's shop
    if (checkResult[0].entrepreneur_id !== entrepreneurId) {
      console.log('❌ Unauthorized update - order belongs to entrepreneur:', checkResult[0].entrepreneur_id, 'but user is:', entrepreneurId);
      return res.status(403).json({ error: 'You do not have permission to update this order' });
    }

    // Valid status update only for entrepreneurs
    // Map friendly names to ENUM values
    const statusMap = {
      'accepted':        'Cooking',
      'confirmed':       'Confirmed',
      'completed':       'Completed',
      'cancelled':       'Cancelled',
      'pending':         'Pending',
      'awaitingpayment': 'AwaitingPayment',
      'Confirmed':       'Confirmed',
      'Cooking':         'Cooking',
      'Completed':       'Completed',
      'Cancelled':       'Cancelled',
      'Pending':         'Pending',
      'AwaitingPayment': 'AwaitingPayment',
    };

    const validStatus = statusMap[status];
    if (!validStatus) {
      return res.status(400).json({ error: 'Invalid status value. Use: confirmed, accepted, completed, cancelled, pending, or AwaitingPayment' });
    }
    console.log('✓ Status mapped:', status, '→', validStatus);

    const updateSql = 'UPDATE tbl_orders SET status = ? WHERE order_id = ?';
    await queryAsync(updateSql, [validStatus, order_id]);

    console.log(`✅ ORDER STATUS UPDATED - order_id: ${order_id}, new_status: ${validStatus}`);
    return res.json({ message: 'Order status updated successfully', order_id, status: validStatus });
  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({ error: 'Failed to update order status: ' + error.message });
  }
});

// Entrepreneur manually confirms payment received → record in tbl_payment + set status Cooking
app.post('/orders/:order_id/confirm-payment', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  const order_id = parseInt(req.params.order_id, 10);
  const { payment_method = 'cash', notes = '' } = req.body;

  console.log('💰 POST /orders/:order_id/confirm-payment - user_id:', user_id, 'order_id:', order_id);

  try {
    // Verify user is an entrepreneur
    const ownerResult = await queryAsync(
      'SELECT entrepreneurs_id FROM tbl_entrepreneurs WHERE user_id = ? LIMIT 1',
      [user_id]
    );
    if (!ownerResult?.length) {
      return res.status(403).json({ error: 'คุณไม่ได้เป็นผู้ประกอบการ' });
    }
    const entrepreneurId = ownerResult[0].entrepreneurs_id;

    // Get order and verify it belongs to this entrepreneur's shop
    const orderResult = await queryAsync(
      `SELECT o.order_id, o.shop_id, o.total_amount, o.status, s.entrepreneur_id
       FROM tbl_orders o
       LEFT JOIN tbl_shops s ON o.shop_id = s.shop_id
       WHERE o.order_id = ?`,
      [order_id]
    );
    if (!orderResult?.length) return res.status(404).json({ error: 'ไม่พบออเดอร์' });

    const order = orderResult[0];
    if (order.entrepreneur_id !== entrepreneurId) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์จัดการออเดอร์นี้' });
    }
    if (order.status !== 'AwaitingPayment' && order.status !== 'Pending') {
      return res.status(400).json({ error: `ออเดอร์นี้อยู่ในสถานะ ${order.status} ไม่สามารถยืนยันชำระเงินได้` });
    }

    // Record payment in tbl_payment
    await queryAsync(
      `INSERT INTO tbl_payment (order_id, amount, paid_at, bank_code, bank_type, status)
       VALUES (?, ?, NOW(), ?, 'manual', 'Verified')`,
      [order_id, order.total_amount, payment_method]
    );

    // Move order to Cooking
    await queryAsync('UPDATE tbl_orders SET status = ? WHERE order_id = ?', ['Cooking', order_id]);

    console.log(`✅ Payment confirmed for order ${order_id} by entrepreneur ${entrepreneurId}`);
    return res.json({ success: true, order_id, status: 'Cooking', message: 'ยืนยันชำระเงินเรียบร้อย ออเดอร์กำลังดำเนินการ' });
  } catch (error) {
    console.error('confirm-payment error:', error);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// Webhook for Omise payment notifications
app.post('/webhooks/omise', express.json(), (req, res) => {
  const event = req.body;
  
  console.log('Omise webhook received:', event.key, event.type);

  if (event.type === 'charge.complete') {
    const charge = event.data;
    
    if (charge.status === 'successful') {
      // Update order status
      const order_id = charge.metadata?.order_id;
      if (order_id) {
        const sql = 'UPDATE tbl_orders SET status = ? WHERE order_id = ?';
        db.query(sql, ['completed', order_id], (err) => {
          if (err) console.error('Webhook order update error:', err);
        });
      }
    }
  }

  res.json({ received: true });
});

// ============================================================
// PRODUCT CRUD ROUTES — จัดการสินค้า
//   POST   /edit-product                  แก้ไขสินค้า (legacy endpoint)
//   POST   /upload-image                  อัปโหลดรูปภาพ base64 → บันทึกใน /uploads/
//   POST   /products/add                  เพิ่มสินค้าใหม่ + sizes (ใช้ใน AddProduct.jsx)
//   PUT    /products/update/:id           แก้ไขสินค้า + replace sizes
//   DELETE /products/:id                  ลบสินค้า (Admin หรือเจ้าของร้านเท่านั้น)
//   POST   /products/create               เพิ่มสินค้า (legacy endpoint)
// ============================================================

// แก้ไขข้อมูลสินค้า (ชื่อ, ราคา, สถานะการขาย) ต้อง login
app.post('/edit-product', verifyToken, (req, res) => {
  const { product_id, name, price, is_available, image_url } = req.body;

  if (!product_id) {
    return res.status(400).json({ error: 'product_id required' });
  }

  // Build dynamic SQL based on what fields are provided
  let updates = [];
  let params = [];

  if (name !== undefined && name !== null && name !== '') {
    updates.push('name = ?');
    params.push(name);
  }
  if (price !== undefined && price !== null && price !== '') {
    updates.push('price = ?');
    params.push(price);
  }
  if (is_available !== undefined && is_available !== null) {
    updates.push('is_available = ?');
    params.push(is_available);
  }
  if (image_url !== undefined) {
    updates.push('image_url = ?');
    params.push(image_url);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'กรุณาระบุฟิลด์ที่ต้องแก้ไข' });
  }

  params.push(product_id);
  const sql = `UPDATE tbl_products SET ${updates.join(', ')} WHERE product_id = ?`;
  
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Edit product error:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'ไม่พบสินค้านี้' });
    }
    console.log('✅ Product updated:', { product_id, name, price, is_available });
    res.json({ 
      message: 'อัปเดตสินค้าสำเร็จ',
      updated: {
        product_id: product_id,
        name: name,
        price: price,
        is_available: is_available
      }
    });
  });
});

// ✅ POST /products/create - เพิ่มสินค้าใหม่สำหรับ Entrepreneur
app.post('/products/create', verifyToken, express.json(), (req, res) => {
  const user_id = req.user_id;
  const { shop_id, name, price, description, image_url, category, stock, is_available } = req.body;

  // ตรวจสอบข้อมูลที่จำเป็น
  if (!shop_id || !name || !price || !description) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็น (shop_id, name, price, description)' });
  }

  console.log('📦 POST /products/create - user_id:', user_id, 'shop_id:', shop_id);

  // ตรวจสอบว่า shop นี้เป็นของ user คนนี้ไหม
  const verifySql = 'SELECT shop_id FROM tbl_entrepreneurs WHERE user_id = ? AND (shop_id = ? OR entrepreneurs_id = ?)';
  db.query(verifySql, [user_id, shop_id, shop_id], (err, rows) => {
    if (err) {
      console.error('❌ Verify shop error:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }

    if (!rows || rows.length === 0) {
      console.log('❌ Shop not owned by this user');
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์เพิ่มสินค้าให้ร้านนี้' });
    }

    // เพิ่มสินค้า
    const productSql = `
      INSERT INTO tbl_products 
      (shop_id, name, price, description, image_url, category, stock, is_available, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      shop_id,
      name,
      parseFloat(price),
      description,
      image_url || null,
      category || null,
      parseInt(stock) || 0,
      is_available !== undefined ? (is_available ? 1 : 0) : 1
    ];

    db.query(productSql, params, (err, result) => {
      if (err) {
        console.error('❌ Create product error:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }

      console.log('✅ Product created:', {
        product_id: result.insertId,
        name,
        price,
        shop_id
      });

      res.status(201).json({
        success: true,
        message: 'เพิ่มสินค้าสำเร็จแล้ว',
        product_id: result.insertId,
        product: {
          product_id: result.insertId,
          shop_id,
          name,
          price: parseFloat(price),
          description,
          image_url: image_url || null,
          category: category || null,
          stock: parseInt(stock) || 0,
          is_available: is_available !== undefined ? (is_available ? 1 : 0) : 1
        }
      });
    });
  });
});

// ✅ DELETE /products/:product_id - ลบสินค้า
// ── Upload image via base64 to Cloudinary or local uploads ─────
app.post('/upload-image', verifyToken, async (req, res) => {
  const { image, prefix = 'img' } = req.body;
  if (!image) return res.status(400).json({ error: 'No image data' });

  try {
    const url = await uploadImageToStorage(image, prefix);
    res.json({ url });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Save failed' });
  }
});

// ── Add product ─────────────────────────────────────────────────
app.post('/products/add', verifyToken, express.json(), async (req, res) => {
  const user_id = req.user_id;
  const { shop_id, name, price, image_url, is_available, unit, description, sizes } = req.body;
  if (!shop_id || !name || price === undefined) return res.status(400).json({ error: 'shop_id, name, price required' });
  try {
    const rows = await queryAsync(
      `SELECT s.shop_id FROM tbl_shops s JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id WHERE e.user_id = ? AND s.shop_id = ?`,
      [user_id, shop_id]
    );
    if (!rows.length) return res.status(403).json({ error: 'Not authorized' });

    const result = await queryAsync(
      'INSERT INTO tbl_products (shop_id, name, price, image_url, is_available, unit, description) VALUES (?,?,?,?,?,?,?)',
      [shop_id, name, parseFloat(price), image_url || null, is_available ?? 1, unit || null, description || null]
    );
    const product_id = result.insertId;

    // Insert sizes (max 5)
    const validSizes = Array.isArray(sizes) ? sizes.filter(s => s.size_name?.trim()).slice(0, 5) : [];
    if (validSizes.length) {
      for (let i = 0; i < validSizes.length; i++) {
        await queryAsync(
          'INSERT INTO tbl_product_sizes (product_id, size_name, price_adjustment, sort_order) VALUES (?,?,?,?)',
          [product_id, validSizes[i].size_name.trim(), parseFloat(validSizes[i].price_adjustment) || 0, i]
        );
      }
    }
    res.json({ product_id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update product ─────────────────────────────────────────────
app.put('/products/update/:product_id', verifyToken, express.json(), async (req, res) => {
  const user_id    = req.user_id;
  const { product_id } = req.params;
  const { name, price, image_url, is_available, unit, description, sizes } = req.body;
  try {
    const userRows = await queryAsync('SELECT role FROM tbl_users WHERE user_id = ? LIMIT 1', [user_id]);
    const isAdmin = userRows?.[0]?.role === 'Admin';

    if (!isAdmin) {
      const ownedShopRows = await queryAsync(
        `SELECT s.shop_id
         FROM tbl_shops s
         JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
         WHERE e.user_id = ?`,
        [user_id]
      );
      const ownedShopIds = new Set(ownedShopRows.map(row => Number(row.shop_id)));

      const productRows = await queryAsync('SELECT shop_id FROM tbl_products WHERE product_id = ? LIMIT 1', [product_id]);
      if (!productRows.length) {
        return res.status(404).json({ error: 'ไม่พบสินค้านี้' });
      }

      const productShopId = Number(productRows[0].shop_id);
      if (!ownedShopIds.has(productShopId)) {
        return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขสินค้านี้' });
      }
    } else {
      const rows = await queryAsync('SELECT product_id FROM tbl_products WHERE product_id = ? LIMIT 1', [product_id]);
      if (!rows.length) return res.status(404).json({ error: 'ไม่พบสินค้านี้' });
    }

    const upd = []; const prm = [];
    if (name !== undefined)         { upd.push('name = ?');         prm.push(name); }
    if (price !== undefined)        { upd.push('price = ?');        prm.push(parseFloat(price)); }
    if (image_url !== undefined)    { upd.push('image_url = ?');    prm.push(image_url); }
    if (is_available !== undefined) { upd.push('is_available = ?'); prm.push(is_available); }
    if (unit !== undefined)         { upd.push('unit = ?');         prm.push(unit || null); }
    if (description !== undefined)  { upd.push('description = ?'); prm.push(description || null); }

    if (upd.length) {
      prm.push(product_id);
      await queryAsync(`UPDATE tbl_products SET ${upd.join(', ')} WHERE product_id = ?`, prm);
    }

    // Replace sizes if provided
    if (Array.isArray(sizes)) {
      await queryAsync('DELETE FROM tbl_product_sizes WHERE product_id = ?', [product_id]);
      const validSizes = sizes.filter(s => s.size_name?.trim()).slice(0, 5);
      for (let i = 0; i < validSizes.length; i++) {
        await queryAsync(
          'INSERT INTO tbl_product_sizes (product_id, size_name, price_adjustment, sort_order) VALUES (?,?,?,?)',
          [product_id, validSizes[i].size_name.trim(), parseFloat(validSizes[i].price_adjustment) || 0, i]
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin shop management ───────────────────────────────────
app.put('/admin/shops/:shop_id', verifyToken, express.json(), async (req, res) => {
  const user_id = req.user_id;
  const { shop_id } = req.params;
  const { shop_name, description, phone_number, location, market_id, status, image_url } = req.body;

  try {
    const userRows = await queryAsync('SELECT role FROM tbl_users WHERE user_id = ? LIMIT 1', [user_id]);
    if (userRows?.[0]?.role !== 'Admin') {
      return res.status(403).json({ error: 'ต้องเป็นแอดมินเพื่อแก้ไขร้านค้า' });
    }

    const shopRows = await queryAsync('SELECT entrepreneur_id FROM tbl_shops WHERE shop_id = ? LIMIT 1', [shop_id]);
    if (!shopRows.length) return res.status(404).json({ error: 'ไม่พบร้านค้านี้' });

    const entrepreneur_id = shopRows[0].entrepreneur_id;

    const entrepreneurUpdates = [];
    const entrepreneurParams = [];

    if (shop_name !== undefined) {
      entrepreneurUpdates.push('shop_name = ?');
      entrepreneurParams.push(shop_name);
    }
    if (description !== undefined) {
      entrepreneurUpdates.push('description = ?');
      entrepreneurParams.push(description);
    }
    if (phone_number !== undefined) {
      entrepreneurUpdates.push('phone_number = ?');
      entrepreneurParams.push(phone_number);
    }
    if (location !== undefined) {
      entrepreneurUpdates.push('location = ?');
      entrepreneurParams.push(location);
    }
    if (market_id !== undefined) {
      entrepreneurUpdates.push('market_id = ?');
      entrepreneurParams.push(Number(market_id));
    }

    if (entrepreneurUpdates.length) {
      entrepreneurParams.push(entrepreneur_id);
      await queryAsync(`UPDATE tbl_entrepreneurs SET ${entrepreneurUpdates.join(', ')} WHERE entrepreneurs_id = ?`, entrepreneurParams);
    }

    const shopUpdates = [];
    const shopParams = [];

    if (shop_name !== undefined) {
      shopUpdates.push('shop_name = ?');
      shopParams.push(shop_name);
    }
    if (description !== undefined) {
      shopUpdates.push('description = ?');
      shopParams.push(description);
    }
    if (image_url !== undefined) {
      shopUpdates.push('image_url = ?');
      shopParams.push(image_url);
    }
    if (market_id !== undefined) {
      shopUpdates.push('market_id = ?');
      shopParams.push(Number(market_id));
    }
    if (status !== undefined) {
      shopUpdates.push('status = ?');
      shopParams.push(status);
    }

    if (shopUpdates.length) {
      shopParams.push(shop_id);
      await queryAsync(`UPDATE tbl_shops SET ${shopUpdates.join(', ')} WHERE shop_id = ?`, shopParams);
    }

    res.json({ success: true, message: 'อัปเดตร้านค้าสำเร็จ' });
  } catch (err) {
    console.error('Admin update shop error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/products/:product_id', verifyToken, (req, res) => {
  const user_id = req.user_id;
  const { product_id } = req.params;

  if (!product_id || isNaN(product_id)) {
    return res.status(400).json({ error: 'product_id ไม่ถูกต้อง' });
  }

  console.log('🗑️ DELETE /products/:product_id - user_id:', user_id, 'product_id:', product_id);

  const doDelete = () => {
    db.getConnection((connErr, conn) => {
      if (connErr) {
        console.error('❌ getConnection error:', connErr);
        return res.status(500).json({ error: 'Connection error: ' + connErr.message });
      }

      const release = (label) => { console.log('🔓 release conn at:', label); conn.release(); };

      console.log('🔧 SET FOREIGN_KEY_CHECKS = 0');
      conn.query('SET FOREIGN_KEY_CHECKS = 0', (err) => {
        if (err) { console.error('❌ FK_CHECKS=0 error:', err); release('fk0'); return res.status(500).json({ error: err.message }); }

        console.log('🗑️ DELETE tbl_cart_items product_id:', product_id);
        conn.query('DELETE FROM tbl_cart_items WHERE product_id = ?', [product_id], (err, r1) => {
          if (err) { console.error('❌ cart_items error:', err); conn.query('SET FOREIGN_KEY_CHECKS = 1', () => release('cart')); return res.status(500).json({ error: err.message }); }
          console.log('✅ cart_items deleted:', r1.affectedRows, 'rows');

          console.log('🗑️ DELETE tbl_products product_id:', product_id);
          conn.query('DELETE FROM tbl_products WHERE product_id = ?', [product_id], (err, result) => {
            conn.query('SET FOREIGN_KEY_CHECKS = 1', () => release('done'));
            if (err) {
              console.error('❌ Delete product error:', err);
              return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            if (result.affectedRows === 0) {
              return res.status(404).json({ error: 'ไม่พบสินค้านี้' });
            }
            console.log('✅ Product deleted:', product_id);
            res.json({ success: true, message: 'ลบสินค้าสำเร็จแล้ว', product_id });
          });
        });
      });
    });
  };

  // ตรวจสอบ role ของ user ก่อน — Admin ข้ามการตรวจสิทธิ์เจ้าของได้เลย
  db.query('SELECT role FROM tbl_users WHERE user_id = ? LIMIT 1', [user_id], (err, userRows) => {
    if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
    const role = userRows?.[0]?.role;

    if (role === 'Admin') {
      return doDelete();
    }

    // ตรวจสอบว่าสินค้านี้เป็นของ user คนนี้ไหม (join ผ่าน tbl_shops)
    const verifySql = `
      SELECT p.product_id
      FROM tbl_products p
      JOIN tbl_shops s ON p.shop_id = s.shop_id
      JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
      WHERE p.product_id = ? AND e.user_id = ?
    `;
    db.query(verifySql, [product_id, user_id], (err, rows) => {
      if (err) {
        console.error('❌ Verify product error:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      if (!rows || rows.length === 0) {
        console.log('❌ Product not found or not owned by this user');
        return res.status(403).json({ error: 'ไม่พบสินค้านี้หรือคุณไม่มีสิทธิ์ลบ' });
      }
      doDelete();
    });
  });
});

// รับข้อมูลก้าวและบันทึกแต้มอัตโนมัติเมื่อถึงเป้าหมาย
app.post('/user/steps', verifyToken, (req, res) => {
  const user_id = req.user_id;
  const { steps } = req.body;
  const STEP_GOAL = 5000;
  const POINTS_REWARD = 100;
  if (!steps || isNaN(steps)) {
    return res.status(400).json({ error: 'กรุณาระบุจำนวนก้าวที่ถูกต้อง' });
  }
  // หา tourist_id จาก user_id
  const getTouristSql = 'SELECT tourist_id, current_points FROM tbl_tourists WHERE user_id = ? LIMIT 1';
  db.query(getTouristSql, [user_id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูล tourist ของ user นี้' });
    }
    const tourist_id = rows[0].tourist_id;
    // ตรวจสอบว่ามี record steps ล่าสุดไหม (ควรมีตาราง steps จริง, ตัวอย่างนี้ mock)
    // สมมติบันทึก steps ล่าสุดใน memory (ควรใช้ฐานข้อมูลจริง)
    // สำหรับตัวอย่างนี้: ให้บันทึกแต้มทันทีถ้า steps >= STEP_GOAL
    if (steps >= STEP_GOAL) {
      const newPoints = (rows[0].current_points || 0) + POINTS_REWARD;
      const updateSql = 'UPDATE tbl_tourists SET current_points = ? WHERE tourist_id = ?';
      db.query(updateSql, [newPoints, tourist_id], (err2) => {
        if (err2) return res.status(500).json({ error: 'Update points failed' });
        return res.json({ success: true, reward: POINTS_REWARD, points: newPoints, message: 'ถึงเป้าหมาย! รับแต้มแล้ว' });
      });
    } else {
      return res.json({ success: true, reward: 0, message: 'ยังไม่ถึงเป้าหมาย' });
    }
  });
});

// Proxy endpoint สำหรับจาก Google Fit (ต้องติดตั้ง 'googleapis' package ก่อน)
// npm install googleapis
app.post('/user/sync-google-fit', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  const { googleAccessToken } = req.body;
  
  if (!googleAccessToken) {
    return res.status(400).json({ error: 'Google access token required' });
  }

  try {
    // ตรวจสอบว่า googleapis module มีอยู่
    let google;
    try {
      google = require('googleapis');
    } catch (e) {
      return res.status(500).json({ error: 'googleapis module not installed. Run: npm install googleapis' });
    }

    const fitness = google.fitness('v1');
    
    // ตั้งค่า OAuth2 client ด้วย access token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: googleAccessToken });

    // ดึงข้อมูลก้าววันนี้
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = now.getTime();

    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      auth: oauth2Client,
      requestBody: {
        aggregateBy: [{
          dataTypeName: 'com.google.step_count.delta'
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startOfDay,
        endTimeMillis: endOfDay
      }
    });

    // ดึงจำนวนก้าว
    let totalSteps = 0;
    if (response.data.bucket && response.data.bucket.length > 0) {
      response.data.bucket.forEach(bucket => {
        bucket.dataset.forEach(dataset => {
          if (dataset.point && dataset.point.length > 0) {
            dataset.point.forEach(point => {
              totalSteps += point.value[0].intVal || 0;
            });
          }
        });
      });
    }

    // บันทึกแต้มหากถึงเป้าหมาย
    const STEP_GOAL = 5000;
    const POINTS_REWARD = 100;
    let reward = 0;

    if (totalSteps >= STEP_GOAL) {
      const getTouristSql = 'SELECT tourist_id, current_points FROM tbl_tourists WHERE user_id = ? LIMIT 1';
      db.query(getTouristSql, [user_id], (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (rows && rows.length > 0) {
          const tourist_id = rows[0].tourist_id;
          const newPoints = (rows[0].current_points || 0) + POINTS_REWARD;
          const updateSql = 'UPDATE tbl_tourists SET current_points = ? WHERE tourist_id = ?';
          db.query(updateSql, [newPoints, tourist_id], (err2) => {
            if (err2) {
              return res.status(500).json({ error: 'Update points failed' });
            }
            return res.json({ 
              success: true, 
              steps: totalSteps, 
              reward: POINTS_REWARD, 
              points: newPoints, 
              message: `ซิงค์ก้าวสำเร็จ! ${totalSteps} ก้าว - ถึงเป้าหมายรับ ${POINTS_REWARD} แต้ม` 
            });
          });
        }
      });
    } else {
      return res.json({ 
        success: true, 
        steps: totalSteps, 
        reward: 0, 
        message: `ซิงค์ก้าวสำเร็จ! ${totalSteps} ก้าว (ยังไม่ถึง ${STEP_GOAL} ก้าว)` 
      });
    }

  } catch (error) {
    console.error('Google Fit sync error:', error);
    return res.status(500).json({ error: `Failed to sync Google Fit: ${error.message}` });
  }
});

// ============================================================
// POINTS API — แต้มสะสม (ระบบใหม่ ใช้ tbl_users.current_points)
//   GET  /user/points                     ดึงแต้มและวันหมดอายุของ user
//   POST /user/exchange-steps-to-points   แปลงก้าวเป็นแต้ม (10 ก้าว = 1 แต้ม)
//   POST /user/add-game-points            เพิ่มแต้มจากเกม (quiz, step counter)
//   GET  /user/redemption-history         ประวัติการแลก reward ของ user
// ============================================================

// Get user's current accumulated points
app.get('/user/points', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  
  try {
    const pointsSql = 'SELECT current_points, points_expiry_date FROM tbl_users WHERE user_id = ?';
    const result = await queryAsync(pointsSql, [user_id]);
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentPoints = result[0].current_points || 0;
    const expiryDate = result[0].points_expiry_date;
    
    return res.json({ 
      success: true,
      points: currentPoints,
      expiry_date: expiryDate,
      user_id: user_id
    });
  } catch (error) {
    console.error('Error fetching user points:', error);
    return res.status(500).json({ error: 'Failed to fetch points: ' + error.message });
  }
});

// Exchange steps to points (fit step conversion)
app.post('/user/exchange-steps-to-points', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  const { steps } = req.body;
  
  // Conversion rate: 10 steps = 1 point
  const STEPS_PER_POINT = 10;
  
  if (!steps || isNaN(steps) || steps <= 0) {
    return res.status(400).json({ error: 'Invalid steps value' });
  }
  
  try {
    // Calculate points earned from steps
    const pointsEarned = Math.floor(steps / STEPS_PER_POINT);
    
    if (pointsEarned <= 0) {
      return res.json({ 
        success: false,
        message: `Need at least ${STEPS_PER_POINT} steps to earn 1 point`,
        pointsEarned: 0,
        stepsUsed: 0
      });
    }
    
    // Get current points
    const getPointsSql = 'SELECT current_points FROM tbl_users WHERE user_id = ?';
    const userResult = await queryAsync(getPointsSql, [user_id]);
    
    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentPoints = userResult[0].current_points || 0;
    const newPoints = currentPoints + pointsEarned;
    
    // Update user points
    const updatePointsSql = 'UPDATE tbl_users SET current_points = ?, points_expiry_date = DATE_ADD(NOW(), INTERVAL 4 YEAR) WHERE user_id = ?';
    await queryAsync(updatePointsSql, [newPoints, user_id]);
    
    // Insert transaction record if payment_logs table exists
    const stepsUsed = pointsEarned * STEPS_PER_POINT;
    const logSql = `INSERT INTO payment_logs (order_id, user_id, amount, status, response, created_at) 
                    VALUES (?, ?, ?, 'step_exchange', ?, NOW())`;
    const logData = JSON.stringify({
      type: 'step_exchange',
      steps_used: stepsUsed,
      points_earned: pointsEarned,
      conversion_rate: `${STEPS_PER_POINT} steps = 1 point`
    });
    
    try {
      await queryAsync(logSql, [null, user_id, pointsEarned, logData]);
    } catch (logErr) {
      console.log('Note: Could not log transaction', logErr);
    }
    
    console.log(`✅ STEP EXCHANGE - user_id: ${user_id}, steps: ${stepsUsed}, points_earned: ${pointsEarned}, new_total: ${newPoints}`);
    
    return res.json({
      success: true,
      message: `Exchanged ${stepsUsed} steps for ${pointsEarned} points!`,
      stepsUsed: stepsUsed,
      pointsEarned: pointsEarned,
      previousPoints: currentPoints,
      currentPoints: newPoints,
      conversionRate: `${STEPS_PER_POINT} steps = 1 point`
    });
  } catch (error) {
    console.error('Error exchanging steps to points:', error);
    return res.status(500).json({ error: 'Failed to exchange steps: ' + error.message });
  }
});

// ============================================================
// REWARDS & QUEST SYSTEM
//   GET  /rewards                  รายการ reward ทั้งหมดที่แลกได้
//   POST /rewards/redeem           แลกแต้มเป็นคูปอง (หักแต้ม + บันทึก redemption_history)
//   GET  /quests                   เควสทั้งหมด + progress ของ user ที่ login
//   POST /quests/:id/claim         claim รางวัลเควส (verify + เพิ่มแต้ม)
// ============================================================

// ══ QUEST SYSTEM ══════════════════════════════════════════════════

// GET /quests — active quests + user's live progress (calculated from real orders)
app.get('/quests', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  try {
    const quests = await queryAsync(
      `SELECT q.*, e.shop_name
       FROM tbl_quests q
       LEFT JOIN tbl_shops s ON q.shop_id = s.shop_id
       LEFT JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
       WHERE q.is_active = 1 ORDER BY q.target_value ASC`
    );

    // Calculate progress from actual completed orders
    const [stats] = await queryAsync(
      `SELECT COUNT(*) AS total_orders,
              COALESCE(SUM(total_amount), 0) AS total_amount,
              COUNT(DISTINCT shop_id) AS shops_visited
       FROM tbl_orders
       WHERE (user_id = ? OR tourist_id = ?) AND status = 'Completed'`,
      [user_id, user_id]
    );

    // Get per-market counts (for buy_in_market + visit_markets quests)
    const marketCounts = await queryAsync(
      `SELECT s.market_id, COUNT(*) AS cnt
       FROM tbl_orders o
       JOIN tbl_shops s ON o.shop_id = s.shop_id
       WHERE (o.user_id = ? OR o.tourist_id = ?) AND o.status = 'Completed'
       GROUP BY s.market_id`,
      [user_id, user_id]
    );
    const mMap = Object.fromEntries(marketCounts.map(r => [r.market_id, Number(r.cnt)]));
    const marketsVisited = marketCounts.length;

    // Get per-shop counts (for buy_from_shop quests)
    const shopCounts = await queryAsync(
      `SELECT o.shop_id, COUNT(*) AS cnt
       FROM tbl_orders o
       WHERE (o.user_id = ? OR o.tourist_id = ?) AND o.status = 'Completed'
       GROUP BY o.shop_id`,
      [user_id, user_id]
    );
    const sMap = Object.fromEntries(shopCounts.map(r => [r.shop_id, Number(r.cnt)]));

    // Get already-claimed quests
    const claimed = await queryAsync(
      'SELECT quest_id FROM tbl_user_quests WHERE user_id = ? AND reward_claimed = 1',
      [user_id]
    );
    const claimedSet = new Set(claimed.map(r => r.quest_id));

    const result = quests.map(q => {
      let cur = 0;
      if      (q.quest_type === 'buy_count')      cur = Number(stats.total_orders);
      else if (q.quest_type === 'buy_amount')      cur = Number(stats.total_amount);
      else if (q.quest_type === 'visit_shops')     cur = Number(stats.shops_visited);
      else if (q.quest_type === 'buy_in_market')   cur = mMap[q.market_id] || 0;
      else if (q.quest_type === 'visit_markets')   cur = marketsVisited;
      else if (q.quest_type === 'buy_from_shop')   cur = sMap[q.shop_id] || 0;

      const reward_claimed = claimedSet.has(q.quest_id);
      const is_completed   = cur >= q.target_value;
      return {
        ...q,
        current_value: Math.min(cur, q.target_value),
        is_completed,
        reward_claimed,
        can_claim: is_completed && !reward_claimed,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /quests/:id/claim — verify & award points
app.post('/quests/:quest_id/claim', verifyToken, async (req, res) => {
  const user_id  = req.user_id;
  const quest_id = parseInt(req.params.quest_id);
  try {
    const quests = await queryAsync(
      'SELECT * FROM tbl_quests WHERE quest_id = ? AND is_active = 1', [quest_id]
    );
    if (!quests.length) return res.status(404).json({ error: 'ไม่พบเควสนี้' });
    const quest = quests[0];

    // Already claimed?
    const existing = await queryAsync(
      'SELECT reward_claimed FROM tbl_user_quests WHERE user_id = ? AND quest_id = ?',
      [user_id, quest_id]
    );
    if (existing.length && existing[0].reward_claimed) {
      return res.status(400).json({ error: 'รับรางวัลนี้แล้ว' });
    }

    // Re-verify progress
    const [stats] = await queryAsync(
      `SELECT COUNT(*) AS total_orders,
              COALESCE(SUM(total_amount), 0) AS total_amount,
              COUNT(DISTINCT shop_id) AS shops_visited
       FROM tbl_orders
       WHERE (user_id = ? OR tourist_id = ?) AND status = 'Completed'`,
      [user_id, user_id]
    );

    let cur = 0;
    if      (quest.quest_type === 'buy_count')    cur = Number(stats.total_orders);
    else if (quest.quest_type === 'buy_amount')   cur = Number(stats.total_amount);
    else if (quest.quest_type === 'visit_shops')  cur = Number(stats.shops_visited);
    else if (quest.quest_type === 'buy_in_market' || quest.quest_type === 'visit_markets') {
      const mRows = await queryAsync(
        `SELECT COUNT(DISTINCT s.market_id) AS markets_visited,
                SUM(o.shop_id IS NOT NULL) AS orders_in_market
         FROM tbl_orders o
         JOIN tbl_shops s ON o.shop_id = s.shop_id
         WHERE (o.user_id = ? OR o.tourist_id = ?) AND o.status = 'Completed'
           ${quest.quest_type === 'buy_in_market' ? 'AND s.market_id = ?' : ''}`,
        quest.quest_type === 'buy_in_market'
          ? [user_id, user_id, quest.market_id]
          : [user_id, user_id]
      );
      cur = quest.quest_type === 'visit_markets'
        ? Number(mRows[0]?.markets_visited || 0)
        : Number(mRows[0]?.orders_in_market || 0);
    } else if (quest.quest_type === 'buy_from_shop') {
      const [sRow] = await queryAsync(
        `SELECT COUNT(*) AS cnt FROM tbl_orders
         WHERE (user_id = ? OR tourist_id = ?) AND shop_id = ? AND status = 'Completed'`,
        [user_id, user_id, quest.shop_id]
      );
      cur = Number(sRow?.cnt || 0);
    }

    if (cur < quest.target_value) {
      return res.status(400).json({ error: `ยังทำเควสไม่ครบ (${cur}/${quest.target_value})` });
    }

    // Award points + mark claimed
    await queryAsync(
      'UPDATE tbl_users SET current_points = current_points + ?, points_expiry_date = DATE_ADD(NOW(), INTERVAL 4 YEAR) WHERE user_id = ?',
      [quest.points_reward, user_id]
    );
    await queryAsync(
      `INSERT INTO tbl_user_quests (user_id, quest_id, reward_claimed, claimed_at)
       VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE reward_claimed = 1, claimed_at = NOW()`,
      [user_id, quest_id]
    );

    // Get new total points
    const [userRow] = await queryAsync(
      'SELECT current_points FROM tbl_users WHERE user_id = ?', [user_id]
    );

    console.log(`✅ Quest ${quest_id} claimed by user ${user_id}, +${quest.points_reward} pts`);
    res.json({
      success: true,
      points_earned: quest.points_reward,
      total_points: userRow?.current_points ?? 0,
      message: `รับ ${quest.points_reward} แต้มเรียบร้อย!`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══ END QUEST SYSTEM ═══════════════════════════════════════════════

// Get all available rewards
app.get('/rewards', (req, res) => {
  const sql = `
    SELECT r.reward_id, r.name, r.points_required, r.description, r.coupon_code, r.is_active,
           r.max_redemptions, r.expiration_date,
           COUNT(rh.redeem_id) AS total_redeemed
    FROM tbl_rewards r
    LEFT JOIN tbl_redemption_history rh ON rh.reward_id = r.reward_id
    WHERE r.is_active = 1
    GROUP BY r.reward_id
    ORDER BY r.points_required ASC`;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching rewards:', err);
      return res.status(500).json({ error: 'Failed to fetch rewards: ' + err.message });
    }
    console.log('✅ Rewards fetched:', results?.length || 0);
    res.json(results || []);
  });
});

// Redeem a reward (exchange points for coupon)
app.post('/rewards/redeem', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  const { reward_id } = req.body;


  if (!reward_id) {
    return res.status(400).json({ error: 'reward_id is required' });
  }

  try {
    // Get reward details
    const rewardSql = 'SELECT * FROM tbl_rewards WHERE reward_id = ? AND is_active = 1';
    const reward = await new Promise((resolve, reject) => {
      db.query(rewardSql, [reward_id], (err, results) => {
        if (err) { console.error('❌ REDEEM step1 (get reward) error:', err.message); reject(err); }
        else resolve(results[0]);
      });
    });

    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    // Get user's current points
    const userSql = 'SELECT current_points FROM tbl_users WHERE user_id = ?';
    const user = await new Promise((resolve, reject) => {
      db.query(userSql, [user_id], (err, results) => {
        if (err) { console.error('❌ REDEEM step2 (get user points) error:', err.message); reject(err); }
        else resolve(results[0]);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPoints = user.current_points || 0;

    // Check global max_redemptions limit
    if (reward.max_redemptions != null) {
      const [countRow] = await queryAsync(
        'SELECT COUNT(*) AS cnt FROM tbl_redemption_history WHERE reward_id = ?', [reward_id]
      );
      const totalRedeemed = Number(countRow?.cnt || 0);
      if (totalRedeemed >= reward.max_redemptions) {
        return res.status(400).json({ error: `คูปองนี้ถูกแลกครบจำนวน ${reward.max_redemptions} ครั้งแล้ว` });
      }
    }

    // Check if user has enough points
    if (currentPoints < reward.points_required) {
      return res.status(400).json({ 
        error: 'ไม่มีแต้มเพียงพอ',
        required: reward.points_required,
        current: currentPoints,
        shortage: reward.points_required - currentPoints
      });
    }

    // Deduct points — ไม่ต่ออายุเมื่อใช้แต้ม (ต่ออายุเฉพาะตอนได้รับแต้ม)
    // ถ้าแต้มหมดเป็น 0 → clear expiry date ด้วย
    const newPoints = currentPoints - reward.points_required;
    const updatePointsSql = newPoints > 0
      ? 'UPDATE tbl_users SET current_points = ? WHERE user_id = ?'
      : 'UPDATE tbl_users SET current_points = 0, points_expiry_date = NULL WHERE user_id = ?';
    await new Promise((resolve, reject) => {
      const updateParams = newPoints > 0 ? [newPoints, user_id] : [user_id];
      db.query(updatePointsSql, updateParams, (err, result) => {
        if (err) { console.error('❌ REDEEM step3 (update points) error:', err.message); reject(err); }
        else resolve();
      });
    });

    // Log the redemption activity (admin_id = 0 for system/user action)
    logAdminActivity(0, user_id, 'redeem_reward', `แลกรางวัล: ${reward.name}`, currentPoints.toString(), newPoints.toString());

    // Record redemption in history — look up tourist_id (FK) from tbl_tourists first
    await new Promise((resolve) => {
      db.query('SELECT tourist_id FROM tbl_tourists WHERE user_id = ?', [user_id], (err, rows) => {
        if (err || !rows?.length) {
          console.error('❌ REDEEM: tourist not found for user_id', user_id, err?.message);
          return resolve();
        }
        const tourist_id = rows[0].tourist_id;
        db.query(
          `INSERT INTO tbl_redemption_history (tourist_id, reward_id, points_spent) VALUES (?, ?, ?)`,
          [tourist_id, reward_id, reward.points_required],
          (err2) => {
            if (err2) console.error('❌ REDEEM history insert error:', err2.message);
            else console.log(`✅ REDEEM history recorded: tourist_id=${tourist_id}, user_id=${user_id}`);
            resolve();
          }
        );
      });
    });

    // Log transaction — exclude order_id (no order for reward redemptions)
    const logData = JSON.stringify({
      type: 'reward_redeemed',
      reward_id: reward_id,
      reward_name: reward.name,
      points_spent: reward.points_required,
      coupon_code: reward.coupon_code
    });
    db.query(
      `INSERT INTO payment_logs (user_id, amount, status, response, created_at)
       VALUES (?, ?, 'reward_redeemed', ?, NOW())`,
      [user_id, reward.points_required, logData],
      (err) => { if (err) console.error('Note: Could not log transaction:', err.message); }
    );

    console.log(`✅ REWARD REDEEMED - user_id: ${user_id}, reward_id: ${reward_id}, points_spent: ${reward.points_required}, coupon: ${reward.coupon_code}`);

    res.json({
      success: true,
      message: 'แลกรางวัลสำเร็จ!',
      reward_name: reward.name,
      coupon_code: reward.coupon_code,
      points_spent: reward.points_required,
      remaining_points: newPoints
    });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    res.status(500).json({ error: 'Failed to redeem reward: ' + error.message });
  }
});

// Get user's redemption history
app.get('/user/redemption-history', verifyToken, (req, res) => {
  const user_id = req.user_id;
  const sql = `SELECT
                rh.redeem_id,
                rh.reward_id,
                r.name as reward_name,
                r.coupon_code,
                rh.points_spent,
                COALESCE(rh.redemption_date, rh.redeem_date) AS redemption_date
               FROM tbl_redemption_history rh
               JOIN tbl_tourists t ON rh.tourist_id = t.tourist_id
               LEFT JOIN tbl_rewards r ON rh.reward_id = r.reward_id
               WHERE t.user_id = ?
               ORDER BY COALESCE(rh.redemption_date, rh.redeem_date) DESC
               LIMIT 20`;
  
  db.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error('Error fetching redemption history:', err);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }
    res.json(results || []);
  });
});

// Add game points (for quiz, step counter, etc.)
app.post('/user/add-game-points', verifyToken, (req, res) => {
  try {
    const user_id = req.user_id;
    const { points, game_type } = req.body;
    
    if (!points || !game_type) {
      return res.status(400).json({ error: 'Missing points or game_type' });
    }

    // Get current points first
    const getPointsSql = 'SELECT current_points FROM tbl_users WHERE user_id = ?';
    db.query(getPointsSql, [user_id], (err, results) => {
      if (err) {
        console.error('❌ Error fetching points:', err);
        return res.status(500).json({ error: 'Failed to fetch points' });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentPoints = results[0].current_points || 0;
      const newPoints = currentPoints + Number(points);

      // Update user's current points
      const updateSql = 'UPDATE tbl_users SET current_points = ?, points_expiry_date = DATE_ADD(NOW(), INTERVAL 4 YEAR) WHERE user_id = ?';
      db.query(updateSql, [newPoints, user_id], (err) => {
        if (err) {
          console.error('❌ Error updating points:', err);
          return res.status(500).json({ error: 'Failed to add points' });
        }

        // Log transaction in transaction_logs table (game points only)
        const logSql = `INSERT INTO transaction_logs (user_id, points, type, description, created_at) 
                        VALUES (?, ?, 'game_earn', ?, NOW())`;
        db.query(logSql, [user_id, points, `Earned from ${game_type} game`], (err) => {
          if (err && err.code !== 'ER_NO_SUCH_TABLE') {
            console.log('Note: Could not log transaction', err.message);
          }
        });

        console.log(`✅ Points added - user_id: ${user_id}, points: ${points}, game: ${game_type}, total: ${newPoints}`);
        res.json({ success: true, message: 'Points added', points_added: points, current_points: newPoints });
      });
    });
  } catch (error) {
    console.error('Error in add-game-points:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// ==================== ADMIN ROUTES - เส้นทางสำหรับผู้ดูแลระบบ ====================

// ✅ ฟังก์ชัน Middleware ตรวจสอบสิทธิ์แอดมิน
// เพื่อแน่ใจว่าเฉพาะ Admin เท่านั้นที่สามารถเข้าถึง Admin Routes
function verifyAdmin(req, res, next) {
  // 1️⃣ ดึง Token จาก HTTP Header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  // ถ้าไม่พบ Token ในฟอร์ม Bearer ให้ลองหาจากที่อื่น
  if (!token) {
    token = authHeader || (req.query && req.query.token) || (req.body && req.body.token);
  }
  
  // 2️⃣ ตรวจสอบว่ามี Token หรือไม่
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // 3️⃣ ตรวจสอบความถูกต้องของ Token (JWT verify)
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    if (!decoded || !decoded.user_id) return res.status(403).json({ error: 'Invalid token structure' });
    
    // 4️⃣ ตรวจสอบว่าผู้ใช้เป็น Admin และบัญชียัง active อยู่
    const sql = 'SELECT role, is_active FROM tbl_users WHERE user_id = ?';
    db.query(sql, [decoded.user_id], (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!result || result.length === 0) return res.status(404).json({ error: 'User not found' });
      
      if (!result[0].is_active) {
        return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งาน', banned: true });
      }
      
      // ถ้า role ไม่ใช่ Admin ให้ปฏิเสธการเข้าถึง
      if (result[0].role !== 'Admin') {
        return res.status(403).json({ error: 'Access denied: Admin only' });
      }
      
      // 5️⃣ ทุกอย่างผ่าน ให้บันทึก user_id, role และ req.user แล้วเรียก next()
      req.user_id = decoded.user_id;
      req.user = { user_id: decoded.user_id, role: result[0].role };
      next();
    });
  });
}

// 🔹 API 1: ดึงรายชื่อผู้ใช้ทั้งหมด พร้อมการค้นหาและกรอง
// ตัวอย่าง: GET /admin/users?role=Admin&is_active=true&search=john
app.get('/admin/users', verifyAdmin, (req, res) => {
  const { role, is_active, search } = req.query;
  let sql = 'SELECT user_id, email, first_name, last_name, phone, role, is_active, created_at, current_points FROM tbl_users WHERE 1=1';
  const params = [];

  // 1️⃣ กรองตามบทบาท (role)
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  
  // 2️⃣ กรองตามสถานะ (is_active: 1=active, 0=banned)
  if (is_active !== undefined) {
    sql += ' AND is_active = ?';
    params.push(is_active === 'true' ? 1 : 0);
  }
  
  // 3️⃣ ค้นหาตามชื่อหรืออีเมล
  if (search) {
    sql += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  // เรียงจากใหม่ไปเก่า
  sql += ' ORDER BY created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('❌ Error fetching users:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ users: results || [] });
  });
});

// 🔹 API 2: ดึงข้อมูลผู้ใช้เพียงคนเดียว พร้อมข้อมูลผู้ประกอบการ (ถ้ามี)
// ตัวอย่าง: GET /admin/users/5
app.get('/admin/users/:user_id', verifyAdmin, (req, res) => {
  const { user_id } = req.params;
  
  // Join กับ tbl_entrepreneurs เพื่อดูว่าเป็นผู้ประกอบการหรือไม่
  const sql = `
    SELECT u.user_id, u.email, u.first_name, u.last_name, u.phone, u.role, u.is_active, u.created_at, u.current_points,
           e.entrepreneurs_id, e.shop_name, e.is_verified
    FROM tbl_users u
    LEFT JOIN tbl_entrepreneurs e ON u.user_id = e.user_id
    WHERE u.user_id = ?
  `;
  db.query(sql, [user_id], (err, result) => {
    if (err) {
      console.error('❌ Error fetching user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result[0] });
  });
});

// 🔹 API 3: แก้ไขข้อมูลผู้ใช้ (ชื่อ, อีเมล, เบอร์โทร)
// ตัวอย่าง: PUT /admin/users/5 { "first_name": "Johnny", "email": "johnny@example.com" }
app.put('/admin/users/:user_id', verifyAdmin, (req, res) => {
  const { user_id } = req.params;
  const { first_name, last_name, phone, email } = req.body;

  const sql = `
    UPDATE tbl_users 
    SET first_name = ?, last_name = ?, phone = ?, email = ?
    WHERE user_id = ?
  `;

  db.query(sql, [first_name, last_name, phone, email, user_id], (err) => {
    if (err) {
      console.error('❌ Error updating user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, message: 'User updated successfully' });
  });
});

// 🔹 API 4: เปลี่ยนบทบาทผู้ใช้เป็น Tourist/Entrepreneur/Admin
// ตัวอย่าง: PUT /admin/users/5/role { "role": "Admin" }
app.put('/admin/users/:user_id/role', verifyAdmin, (req, res) => {
  const { user_id } = req.params;
  const { role } = req.body;

  // ตรวจสอบว่า role ถูกต้องหรือไม่
  if (!['Tourist', 'Entrepreneur', 'Admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const sql = 'UPDATE tbl_users SET role = ? WHERE user_id = ?';
  db.query(sql, [role, user_id], (err) => {
    if (err) {
      console.error('❌ Error updating role:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, message: `User role changed to ${role}` });
  });
});

// 🔹 API 5: แบนผู้ใช้ (ปิดการใช้งาน is_active = 0)
// ตัวอย่าง: PUT /admin/users/5/ban
app.put('/admin/users/:user_id/ban', verifyAdmin, (req, res) => {
  const { user_id } = req.params;

  db.query('UPDATE tbl_users SET is_active = 0 WHERE user_id = ?', [user_id], (err) => {
    if (err) {
      console.error('❌ Error banning user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    // ปิดร้านทุกร้านของ user นี้
    const closeSql = `
      UPDATE tbl_shops s
      JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
      SET s.status = 'Closed'
      WHERE e.user_id = ?
    `;
    db.query(closeSql, [user_id], (shopErr) => {
      if (shopErr) console.error('⚠️ Error closing shops on ban:', shopErr);
      res.json({ success: true, message: 'User banned and shops closed' });
    });
  });
});

// 🔹 API 6: ปลดแบนผู้ใช้ (เปิดการใช้งาน is_active = 1)
// ตัวอย่าง: PUT /admin/users/5/unban
app.put('/admin/users/:user_id/unban', verifyAdmin, (req, res) => {
  const { user_id } = req.params;

  db.query('UPDATE tbl_users SET is_active = 1 WHERE user_id = ?', [user_id], (err) => {
    if (err) {
      console.error('❌ Error unbanning user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    // เปิดร้านคืนทุกร้านของ user นี้
    const openSql = `
      UPDATE tbl_shops s
      JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
      SET s.status = 'Open'
      WHERE e.user_id = ?
    `;
    db.query(openSql, [user_id], (shopErr) => {
      if (shopErr) console.error('⚠️ Error reopening shops on unban:', shopErr);
      res.json({ success: true, message: 'User unbanned and shops reopened' });
    });
  });
});

// 🔹 API 7: ดึงผู้ประกอบการที่รอการอนุมัติ (is_verified = 0)
// ตัวอย่าง: GET /admin/pending-entrepreneurs
app.get('/admin/pending-entrepreneurs', verifyAdmin, (req, res) => {
  const sql = `
    SELECT e.*, u.email, u.first_name, u.last_name, u.phone
    FROM tbl_entrepreneurs e
    LEFT JOIN tbl_users u ON e.user_id = u.user_id
    WHERE e.is_verified = 0  -- ← เฉพาะคำขอที่ยังไม่ได้อนุมัติ
    ORDER BY e.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching pending entrepreneurs:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('✅ Pending entrepreneurs fetched:', results.length, 'records');
    res.json({ entrepreneurs: results || [] });
  });
});

// 🔹 API 8: อนุมัติผู้ประกอบการ (set is_verified = 1)
// ตัวอย่าง: PUT /admin/entrepreneurs/10/verify
app.put('/admin/entrepreneurs/:entrepreneurs_id/verify', verifyAdmin, (req, res) => {
  const { entrepreneurs_id } = req.params;
  
  const sql = 'UPDATE tbl_entrepreneurs SET is_verified = 1 WHERE entrepreneurs_id = ?';
  db.query(sql, [entrepreneurs_id], (err) => {
    if (err) {
      console.error('❌ Error verifying entrepreneur:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, message: 'Entrepreneur verified successfully' });
  });
});

// 🔹 API 9: ปฏิเสธผู้ประกอบการ (ลบบันทึก)
// ตัวอย่าง: PUT /admin/entrepreneurs/10/reject
app.put('/admin/entrepreneurs/:entrepreneurs_id/reject', verifyAdmin, (req, res) => {
  const { entrepreneurs_id } = req.params;
  
  const sql = 'DELETE FROM tbl_entrepreneurs WHERE entrepreneurs_id = ?';
  db.query(sql, [entrepreneurs_id], (err) => {
    if (err) {
      console.error('❌ Error rejecting entrepreneur:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, message: 'Entrepreneur request rejected' });
  });
});

// 🔹 API 10: ลบผู้ใช้ (Soft Delete - เปลี่ยน is_active = 0)
// ตัวอย่าง: DELETE /admin/users/5
app.delete('/admin/users/:user_id', verifyAdmin, (req, res) => {
  const { user_id } = req.params;
  
  // Soft delete: ไม่ลบข้อมูล เพียงแค่ปิดการใช้งาน
  const sql = 'UPDATE tbl_users SET is_active = 0 WHERE user_id = ?';
  db.query(sql, [user_id], (err) => {
    if (err) {
      console.error('❌ Error deleting user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  });
});

// 🔹 API 11: ดึงผู้ประกอบการทั้งหมด (อนุมัติแล้วและรอการอนุมัติ)
// ตัวอย่าง: GET /admin/entrepreneurs
app.get('/admin/entrepreneurs', verifyAdmin, (req, res) => {
  const sql = `
    SELECT e.*, u.email, u.first_name, u.last_name, u.phone
    FROM tbl_entrepreneurs e
    LEFT JOIN tbl_users u ON e.user_id = u.user_id
    ORDER BY e.is_verified ASC, e.created_at DESC
    -- ↑ เรียงให้คำขอที่รอการอนุมัติอยู่ด้านบน
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching entrepreneurs:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('✅ All entrepreneurs fetched:', results.length, 'records');
    res.json({ entrepreneurs: results || [] });
  });
});

// ==================== ACTIVITY LOGGING SYSTEM - ระบบบันทึกกิจกรรม ====================

// สร้างตาราง admin_activity_log ถ้ายังไม่มี (เก็บประวัติการแก้ไขข้อมูล)
const createActivityLogTable = `
  CREATE TABLE IF NOT EXISTS admin_activity_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,                    -- ID ของแอดมินที่ทำการแก้ไข
    user_id INT,                              -- ID ของผู้ใช้ที่ถูกแก้ไข
    action VARCHAR(100) NOT NULL COMMENT 'เช่น edit_points, ban_user, change_role, verify_entrepreneur',
    description TEXT,                         -- รายละเอียด
    old_value VARCHAR(255),                   -- ค่าเดิม
    new_value VARCHAR(255),                   -- ค่าใหม่
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES tbl_users(user_id),
    FOREIGN KEY (user_id) REFERENCES tbl_users(user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

db.query(createActivityLogTable, (err) => {
  if (err) {
    console.error('❌ Failed to create activity_log table:', err);
  } else {
    console.log('✅ admin_activity_log table ready');
    // Migration: allow NULL admin_id for system-generated logs (admin_id = 0 not valid FK)
    db.query(
      `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_activity_log' AND COLUMN_NAME = 'admin_id'`,
      (e2, rows) => {
        // Drop FK on admin_id so 0 can be used for system-generated logs
        db.query(
          `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_activity_log'
             AND COLUMN_NAME = 'admin_id' AND REFERENCED_TABLE_NAME = 'tbl_users'`,
          (e3, fkRows) => {
            if (e3 || !fkRows?.length) return;
            const fkName = fkRows[0].CONSTRAINT_NAME;
            db.query(`ALTER TABLE admin_activity_log DROP FOREIGN KEY ${fkName}`, (e4) => {
              if (e4) console.error('❌ Could not drop admin_id FK:', e4.message);
              else console.log('✅ Dropped FK on admin_activity_log.admin_id (0 = system)');
            });
          }
        );
      }
    );
  }
});

// ✅ ฟังก์ชัน Helper สำหรับบันทึกกิจกรรม
// ทำหน้าที่บันทึกข้อมูลการแก้ไขลงในตาราง admin_activity_log
function logAdminActivity(adminId, userId, action, description, oldValue, newValue) {
  const safeAdminId = adminId;
  const sql = `
    INSERT INTO admin_activity_log (admin_id, user_id, action, description, old_value, new_value)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [safeAdminId, userId, action, description, oldValue, newValue], (err) => {
    if (err) console.error('❌ Error logging activity:', err.message);
  });
}

// ==================== ADMIN ADVANCED FEATURES ====================

// EDIT user points (แก้ไขแต้มสะสม)
app.put('/admin/users/:user_id/points', verifyAdmin, (req, res) => {
  const { user_id } = req.params;
  const { points, reason } = req.body;

  if (typeof points !== 'number' || points < 0) {
    return res.status(400).json({ error: 'Invalid points value' });
  }

  // Get current points
  const getPointsSql = 'SELECT current_points FROM tbl_users WHERE user_id = ?';
  db.query(getPointsSql, [user_id], (err, result) => {
    if (err || !result || result.length === 0) {
      return res.status(500).json({ error: 'Database error' });
    }

    const oldPoints = result[0].current_points;
    const updateSql = 'UPDATE tbl_users SET current_points = ?, points_expiry_date = DATE_ADD(NOW(), INTERVAL 4 YEAR) WHERE user_id = ?';
    
    db.query(updateSql, [points, user_id], (err) => {
      if (err) {
        console.error('❌ Error updating points:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Log the activity
      logAdminActivity(req.user_id, user_id, 'edit_points', reason || 'แก้ไขแต้มสะสม', oldPoints.toString(), points.toString());

      res.json({ 
        success: true, 
        message: 'Points updated successfully',
        old_points: oldPoints,
        new_points: points
      });
    });
  });
});

// GET user activity history
app.get('/admin/user-activity/:user_id', verifyAdmin, (req, res) => {
  const { user_id } = req.params;
  
  const sql = `
    SELECT l.*, 
           a.first_name as admin_name, a.last_name as admin_lastname,
           u.first_name as user_name, u.last_name as user_lastname
    FROM admin_activity_log l
    LEFT JOIN tbl_users a ON l.admin_id = a.user_id
    LEFT JOIN tbl_users u ON l.user_id = u.user_id
    WHERE l.user_id = ?
    ORDER BY l.created_at DESC
    LIMIT 100
  `;

  db.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error('❌ Error fetching activity history:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ activities: results || [] });
  });
});

// GET all admin activities (for audit log)
app.get('/admin/activity-log', verifyAdmin, (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const sql = `
    SELECT l.*, 
           a.first_name as admin_name, a.last_name as admin_lastname,
           u.first_name as user_name, u.last_name as user_lastname
    FROM admin_activity_log l
    LEFT JOIN tbl_users a ON l.admin_id = a.user_id
    LEFT JOIN tbl_users u ON l.user_id = u.user_id
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.query(sql, [parseInt(limit), parseInt(offset)], (err, results) => {
    if (err) {
      console.error('❌ Error fetching activity log:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ logs: results || [] });
  });
});

// Modify existing role change endpoint to log activity
app.put('/admin/users/:user_id/role-with-log', verifyAdmin, (req, res) => {
  const { user_id } = req.params;
  const { role } = req.body;

  if (!['Tourist', 'Entrepreneur', 'Admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Get current role
  const getSql = 'SELECT role FROM tbl_users WHERE user_id = ?';
  db.query(getSql, [user_id], (err, result) => {
    if (err || !result || result.length === 0) {
      return res.status(500).json({ error: 'Database error' });
    }

    const oldRole = result[0].role;
    const updateSql = 'UPDATE tbl_users SET role = ? WHERE user_id = ?';

    db.query(updateSql, [role, user_id], (err) => {
      if (err) {
        console.error('❌ Error updating role:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Log the activity
      logAdminActivity(req.user_id, user_id, 'change_role', `เปลี่ยนบทบาท`, oldRole, role);

      res.json({ success: true, message: `User role changed from ${oldRole} to ${role}` });
    });
  });
});

// Log ban activity
app.put('/admin/users/:user_id/ban-with-log', verifyAdmin, (req, res) => {
  const { user_id } = req.params;
  const { reason = 'ไม่ระบุเหตุผล' } = req.body;

  const sql = 'UPDATE tbl_users SET is_active = 0 WHERE user_id = ?';
  db.query(sql, [user_id], (err) => {
    if (err) {
      console.error('❌ Error banning user:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Log the activity
    logAdminActivity(req.user_id, user_id, 'ban_user', reason, '1', '0');

    res.json({ success: true, message: 'User banned successfully' });
  });
});

// Log unban activity
app.put('/admin/users/:user_id/unban-with-log', verifyAdmin, (req, res) => {
  const { user_id } = req.params;
  const { reason = 'ไม่ระบุเหตุผล' } = req.body;

  const sql = 'UPDATE tbl_users SET is_active = 1 WHERE user_id = ?';
  db.query(sql, [user_id], (err) => {
    if (err) {
      console.error('❌ Error unbanning user:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Log the activity
    logAdminActivity(req.user_id, user_id, 'unban_user', reason, '0', '1');

    res.json({ success: true, message: 'User unbanned successfully' });
  });
});

// GET admin info (generic endpoint)
app.get('/admin', verifyAdmin, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Admin access granted',
    user: { 
      user_id: req.user?.user_id,
      role: req.user?.role 
    }
  });
});

// DEBUG: Get raw entrepreneurs data
app.get('/admin/debug-entrepreneurs', verifyAdmin, (req, res) => {
  const sql = `SELECT COUNT(*) as total FROM tbl_entrepreneurs`;
  db.query(sql, (err, countResult) => {
    if (err) {
      return res.json({ error: err.message, query: sql });
    }
    
    // Get all entrepreneurs with all fields
    const sqlAll = `SELECT * FROM tbl_entrepreneurs`;
    db.query(sqlAll, (err, allResults) => {
      if (err) {
        return res.json({ error: err.message, query: sqlAll });
      }
      
      // Get verified/unverified counts
      const sqlVerified = `SELECT is_verified, COUNT(*) as count FROM tbl_entrepreneurs GROUP BY is_verified`;
      db.query(sqlVerified, (err, verifiedResults) => {
        if (err) {
          return res.json({ error: err.message });
        }
        
        res.json({
          total: countResult[0].total,
          verified_breakdown: verifiedResults,
          all_entrepreneurs: allResults,
          sample_first_entrepreneur: allResults[0]
        });
      });
    });
  });
});

// GET dashboard statistics
// 🔹 API 12: ดึงสถิติระบบทั้งหมด (Dashboard)
// ตัวอย่าง: GET /admin/dashboard-stats
app.get('/admin/dashboard-stats', verifyAdmin, (req, res) => {
  try {
    // Query 1️⃣: นับจำนวนผู้ใช้ทั้งหมด
    const totalUsersSql = 'SELECT COUNT(*) as total FROM tbl_users';
    
    // Query 2️⃣: นับตามบทบาท (Tourist, Entrepreneur, Admin)
    const roleCountSql = `
      SELECT 
        SUM(CASE WHEN role = 'Tourist' THEN 1 ELSE 0 END) as tourists,
        (SELECT COUNT(*) FROM tbl_entrepreneurs) as entrepreneurs,
        SUM(CASE WHEN role = 'Admin' THEN 1 ELSE 0 END) as admins
      FROM tbl_users
    `;
    
    // Query 3️⃣: นับจำนวนผู้ใช้ที่ถูกแบน (is_active = 0)
    const bannedUsersSql = 'SELECT COUNT(*) as banned FROM tbl_users WHERE is_active = 0';
    
    // Query 4️⃣: นับจำนวนผู้ประกอบการที่รอการอนุมัติ (is_verified = 0)
    const pendingEntrepreneursSql = 'SELECT COUNT(*) as pending FROM tbl_entrepreneurs WHERE is_verified = 0';
    
    // Query 5️⃣: นับจำนวนคำสั่งซื้อทั้งหมด
    const ordersCountSql = 'SELECT COUNT(*) as total FROM tbl_orders';

    let statsData = {};
    let queriesCompleted = 0;
    const totalQueries = 5;

    // ✅ ฟังก์ชัน Helper สำหรับตรวจสอบว่า Query ทั้งหมดเสร็จหรือไม่
    const checkComplete = () => {
      queriesCompleted++;
      if (queriesCompleted === totalQueries) {
        // ส่งผลลัพธ์กลับเมื่อ Query ทั้งหมดเสร็จ
        res.json({
          success: true,
          stats: {
            total_users: statsData.total_users || 0,
            total_tourists: statsData.total_tourists || 0,
            total_entrepreneurs: statsData.total_entrepreneurs || 0,
            total_admins: statsData.total_admins || 0,
            banned_users: statsData.banned_users || 0,
            pending_entrepreneurs: statsData.pending_entrepreneurs || 0,
            total_orders: statsData.total_orders || 0
          }
        });
      }
    };

    // Execute Query 1️⃣: จำนวนผู้ใช้ทั้งหมด
    db.query(totalUsersSql, (err, result) => {
      if (!err && result) statsData.total_users = result[0].total;
      checkComplete();
    });

    // Execute Query 2️⃣: นับตามบทบาท
    db.query(roleCountSql, (err, result) => {
      if (!err && result) {
        statsData.total_tourists = result[0].tourists || 0;
        statsData.total_entrepreneurs = result[0].entrepreneurs || 0;
        statsData.total_admins = result[0].admins || 0;
      }
      checkComplete();
    });

    // Execute Query 3️⃣: นับผู้ถูกแบน
    db.query(bannedUsersSql, (err, result) => {
      if (!err && result) statsData.banned_users = result[0].banned;
      checkComplete();
    });

    // Execute Query 4️⃣: นับรอการอนุมัติ
    db.query(pendingEntrepreneursSql, (err, result) => {
      if (!err && result) statsData.pending_entrepreneurs = result[0].pending;
      checkComplete();
    });

    // Execute Query 5️⃣: นับคำสั่งซื้อ
    db.query(ordersCountSql, (err, result) => {
      if (!err && result) statsData.total_orders = result[0].total;
      checkComplete();
    });

  } catch (err) {
    console.error('❌ Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Validate a coupon code (check exists + not used)
app.post('/coupons/validate', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  const { coupon_code, redeem_id } = req.body;

  if (!redeem_id && (!coupon_code || !coupon_code.trim())) {
    return res.status(400).json({ valid: false, error: 'กรุณาระบุโค้ดส่วนลด' });
  }
  try {
    let reward, redeemRow;

    if (redeem_id) {
      // Validate by specific coupon instance (redeem_id)
      const rows = await queryAsync(
        `SELECT rh.redeem_id, r.reward_id, r.name, r.discount_amount, r.points_required, r.coupon_code
         FROM tbl_redemption_history rh
         JOIN tbl_rewards r ON rh.reward_id = r.reward_id
         LEFT JOIN tbl_tourists t ON rh.tourist_id = t.tourist_id
         WHERE rh.redeem_id = ? AND (t.user_id = ? OR rh.tourist_id = ?) AND r.is_active = 1`,
        [redeem_id, user_id, user_id]
      );
      if (!rows?.length) return res.json({ valid: false, error: 'ไม่พบคูปองนี้' });
      redeemRow = rows[0];
      reward = redeemRow;

      // Check if this specific instance is already used
      const usage = await queryAsync('SELECT usage_id FROM tbl_coupon_usage WHERE redeem_id = ? LIMIT 1', [redeem_id]);
      if (usage?.length) return res.json({ valid: false, error: 'คูปองใบนี้ถูกใช้ไปแล้ว' });
    } else {
      // Fallback: validate by coupon_code (find first unused instance for this user)
      const rewards = await queryAsync(
        'SELECT reward_id, name, discount_amount, points_required, coupon_code FROM tbl_rewards WHERE coupon_code = ? AND is_active = 1',
        [coupon_code.trim()]
      );
      if (!rewards?.length) return res.json({ valid: false, error: 'โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุแล้ว' });
      reward = rewards[0];

      // Find an unused redeem_id for this user + reward
      const unusedRows = await queryAsync(
        `SELECT rh.redeem_id FROM tbl_redemption_history rh
         LEFT JOIN tbl_tourists t ON rh.tourist_id = t.tourist_id
         LEFT JOIN tbl_coupon_usage cu ON cu.redeem_id = rh.redeem_id
         WHERE rh.reward_id = ? AND (t.user_id = ? OR rh.tourist_id = ?) AND cu.usage_id IS NULL
         ORDER BY rh.redeem_id ASC LIMIT 1`,
        [reward.reward_id, user_id, user_id]
      );
      if (!unusedRows?.length) return res.json({ valid: false, error: 'ไม่มีคูปองที่ยังไม่ได้ใช้' });
      redeemRow = unusedRows[0];
    }

    const discountAmount = reward.discount_amount || reward.points_required || 0;
    return res.json({
      valid: true,
      redeem_id: redeemRow.redeem_id,
      coupon_code: reward.coupon_code,
      discount_amount: discountAmount,
      reward_name: reward.name,
      message: `ใช้คูปอง "${reward.name}" ลด ฿${discountAmount.toLocaleString()}`
    });
  } catch (error) {
    console.error('Coupon validate error:', error);
    return res.status(500).json({ valid: false, error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// Get user's own redeemed coupons with used/unused status
app.get('/user/my-coupons', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  try {
    // Each redeem_id = 1 coupon instance, track usage per redeem_id
    const sql = `
      SELECT
        rh.redeem_id,
        COALESCE(r.name, 'รางวัล')                                          AS reward_name,
        COALESCE(r.coupon_code, '')                                          AS coupon_code,
        COALESCE(r.discount_amount, r.points_required, rh.points_spent, 0)  AS discount_amount,
        COALESCE(rh.redemption_date, rh.redeem_date)                        AS redemption_date,
        CASE WHEN cu.usage_id IS NOT NULL THEN 1 ELSE 0 END                 AS is_used
      FROM tbl_redemption_history rh
      LEFT JOIN tbl_tourists t  ON rh.tourist_id = t.tourist_id
      LEFT JOIN tbl_rewards   r ON rh.reward_id  = r.reward_id
      LEFT JOIN tbl_coupon_usage cu ON cu.redeem_id = rh.redeem_id
      WHERE (t.user_id = ? OR rh.tourist_id = ?)
        AND r.coupon_code IS NOT NULL AND r.coupon_code != ''
      ORDER BY (cu.usage_id IS NULL) DESC, rh.redeem_id DESC
    `;
    const results = await queryAsync(sql, [user_id, user_id]);
    return res.json(Array.isArray(results) ? results : []);
  } catch (error) {
    console.error('Get my-coupons error:', error);
    return res.status(500).json({ error: 'Failed to fetch coupons: ' + error.message });
  }
});

// ============================================================
// SOCKET.IO — Realtime Stats สำหรับ Admin Dashboard
//   ต่อ socket เฉพาะ Admin (verify JWT + role ใน io.use middleware)
//   broadcastStats()   push ข้อมูล users/orders ให้ทุก Admin ทุก 6 วินาที
//   fetchRealtimeStats() query ตัวเลขรวมจาก DB แล้ว callback กลับ
//   event ที่ emit: "stats:update" → { totalUsers, tourists, businesses, orders }
// ============================================================
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'], credentials: true }
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, SECRET_KEY);
    if (decoded.role !== 'Admin') return next(new Error('Admin only'));
    socket.data.user = decoded;
    next();
  } catch { next(new Error('Invalid token')); }
});

function fetchRealtimeStats(callback) {
  const sql = `
    SELECT
      COUNT(*) AS totalUsers,
      SUM(role = 'Tourist') AS tourists,
      (SELECT COUNT(*) FROM tbl_entrepreneurs) AS businesses,
      (SELECT COUNT(*) FROM tbl_orders) AS orders
    FROM tbl_users
  `;
  db.query(sql, (err, rows) => {
    if (err) return callback(err, null);
    const r = rows[0];
    callback(null, {
      totalUsers: Number(r.totalUsers) || 0,
      tourists:   Number(r.tourists)   || 0,
      businesses: Number(r.businesses) || 0,
      orders:     Number(r.orders)     || 0,
    });
  });
}

function broadcastStats() {
  fetchRealtimeStats((err, stats) => {
    if (!err) io.emit('stats:update', stats);
  });
}

io.on('connection', (socket) => {
  console.log(`[Socket] Admin connected: ${socket.data.user?.user_id}`);
  fetchRealtimeStats((err, stats) => { if (!err) socket.emit('stats:update', stats); });
  socket.on('disconnect', () => console.log(`[Socket] Admin disconnected: ${socket.data.user?.user_id}`));
});

setInterval(broadcastStats, 6000);

// ══ รีแต้มเมื่อหมดอายุ ══════════════════════════════════════════
const resetExpiredPoints = () => {
  db.query(
    `UPDATE tbl_users
     SET current_points = 0, points_expiry_date = NULL
     WHERE points_expiry_date IS NOT NULL
       AND points_expiry_date < CURDATE()
       AND current_points > 0`,
    (err, result) => {
      if (err) return console.error('❌ resetExpiredPoints error:', err.message);
      if (result.affectedRows > 0)
        console.log(`✅ รีแต้มหมดอายุ: ${result.affectedRows} user(s)`);
    }
  );
};
resetExpiredPoints(); // รันตอน server start
setInterval(resetExpiredPoints, 24 * 60 * 60 * 1000); // ทุก 24 ชั่วโมง

// Stats by period: 1d = last 24h by hour, 1m = last 30d by day, 1y = last 12mo by month
app.get('/admin/stats-period', verifyAdmin, async (req, res) => {
  const { period } = req.query;

  // SQL สำหรับ orders + revenue
  let orderSql, userSql;

  if (period === '1d') {
    orderSql = `SELECT DATE_FORMAT(created_at,'%H:00') AS label,
                       COUNT(*) AS orders, SUM(total_amount) AS revenue
                FROM tbl_orders WHERE DATE(created_at) = CURDATE()
                GROUP BY DATE_FORMAT(created_at,'%H') ORDER BY MIN(created_at)`;
    userSql = `SELECT DATE_FORMAT(created_at,'%H:00') AS label,
                      COUNT(*) AS new_users,
                      SUM(role='Tourist') AS new_tourists,
                      SUM(role='Entrepreneur') AS new_entrepreneurs
               FROM tbl_users WHERE DATE(created_at) = CURDATE()
               GROUP BY DATE_FORMAT(created_at,'%H') ORDER BY MIN(created_at)`;
  } else if (period === '1m') {
    orderSql = `SELECT DATE_FORMAT(created_at,'%d/%m') AS label,
                       COUNT(*) AS orders, SUM(total_amount) AS revenue
                FROM tbl_orders
                WHERE YEAR(created_at)=YEAR(NOW()) AND MONTH(created_at)=MONTH(NOW())
                GROUP BY DATE(created_at) ORDER BY MIN(created_at)`;
    userSql = `SELECT DATE_FORMAT(created_at,'%d/%m') AS label,
                      COUNT(*) AS new_users,
                      SUM(role='Tourist') AS new_tourists,
                      SUM(role='Entrepreneur') AS new_entrepreneurs
               FROM tbl_users
               WHERE YEAR(created_at)=YEAR(NOW()) AND MONTH(created_at)=MONTH(NOW())
               GROUP BY DATE(created_at) ORDER BY MIN(created_at)`;
  } else if (period === '1y') {
    orderSql = `SELECT DATE_FORMAT(created_at,'%b %y') AS label,
                       COUNT(*) AS orders, SUM(total_amount) AS revenue
                FROM tbl_orders WHERE YEAR(created_at)=YEAR(NOW())
                GROUP BY DATE_FORMAT(created_at,'%Y-%m') ORDER BY MIN(created_at)`;
    userSql = `SELECT DATE_FORMAT(created_at,'%b %y') AS label,
                      COUNT(*) AS new_users,
                      SUM(role='Tourist') AS new_tourists,
                      SUM(role='Entrepreneur') AS new_entrepreneurs
               FROM tbl_users WHERE YEAR(created_at)=YEAR(NOW())
               GROUP BY DATE_FORMAT(created_at,'%Y-%m') ORDER BY MIN(created_at)`;
  } else {
    return res.status(400).json({ error: 'Invalid period. Use 1d, 1m, or 1y' });
  }

  // ใช้ SQL ตัวเดิมสำหรับ orders (compat)
  const sql = orderSql;
  try {
    const [orderRows, userRows] = await Promise.all([
      queryAsync(sql, []),
      queryAsync(userSql, []),
    ]);

    const oMap = Object.fromEntries(
      (orderRows || []).map(r => [r.label, { orders: Number(r.orders), revenue: Number(r.revenue || 0) }])
    );
    const uMap = Object.fromEntries(
      (userRows || []).map(r => [r.label, {
        new_users:        Number(r.new_users || 0),
        new_tourists:     Number(r.new_tourists || 0),
        new_entrepreneurs:Number(r.new_entrepreneurs || 0),
      }])
    );

    const empty = () => ({ orders: 0, revenue: 0, new_users: 0, new_tourists: 0, new_entrepreneurs: 0 });

    let full;
    if (period === '1d') {
      full = Array.from({ length: 24 }, (_, h) => {
        const label = `${String(h).padStart(2, '0')}:00`;
        return { label, ...empty(), ...oMap[label], ...uMap[label] };
      });
    } else if (period === '1m') {
      const now = new Date();
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      full = Array.from({ length: days }, (_, i) => {
        const label = `${String(i + 1).padStart(2, '0')}/${mm}`;
        return { label, ...empty(), ...oMap[label], ...uMap[label] };
      });
    } else {
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const yy = String(new Date().getFullYear()).slice(-2);
      full = MONTHS.map(mon => {
        const label = `${mon} ${yy}`;
        return { label, ...empty(), ...oMap[label], ...uMap[label] };
      });
    }
    res.json(full);
  } catch (err) {
    res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

app.get('/admin/realtime-stats', verifyAdmin, (req, res) => {
  fetchRealtimeStats((err, stats) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(stats);
  });
});

// Per-market order counts (สำหรับ MarketStatsSection)
app.get('/admin/realtime-stats/markets', verifyAdmin, async (req, res) => {
  try {
    const markets = await queryAsync(
      `SELECT fm.name, COUNT(o.order_id) AS orders
       FROM tbl_floating_markets fm
       LEFT JOIN tbl_shops s ON s.market_id = fm.market_id
       LEFT JOIN tbl_orders o ON o.shop_id = s.shop_id
       GROUP BY fm.market_id, fm.name
       ORDER BY orders DESC`
    );
    const total = markets.reduce((s, m) => s + Number(m.orders), 0);
    res.json({
      markets: markets.map(m => ({ name: m.name, orders: Number(m.orders) })),
      total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// QUIZ & GAME ROUTES
//   GET  /quiz/daily              ดึงชุดคำถามวันนี้ (5 ข้อสุ่ม, ทำวันละ 1 ครั้ง)
//   POST /quiz/daily/complete     บันทึกคะแนน + เพิ่มแต้มให้ user
//   GET  /quiz-questions          คำถามทั้งหมดที่ active (ใช้ใน GameQuiz.jsx)
//   GET  /settings/game           ตรวจว่าเกมเปิดอยู่หรือเปล่า
//   --- Admin ---
//   GET/POST/PUT/DELETE /admin/quiz-questions  จัดการข้อสอบ
//   GET/POST/PUT/DELETE /admin/quests         จัดการเควส
//   PUT  /admin/settings/game                 เปิด/ปิดระบบเกม
// ============================================================

// ══════════════════════════════════════════════════════════════════
// DAILY QUIZ SYSTEM
// ══════════════════════════════════════════════════════════════════

// GET /quiz/daily — ดึงชุดคำถามวันนี้ (สร้างใหม่หรือคืนของเดิม)
app.get('/quiz/daily', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  const today   = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // เช็คว่ามี session วันนี้แล้วหรือไม่
    const [existing] = await queryAsync(
      'SELECT * FROM tbl_quiz_daily_sessions WHERE user_id = ? AND quiz_date = ?',
      [user_id, today]
    );

    if (existing) {
      // มีแล้ว — คืน session + คำถาม
      const ids = existing.question_ids.split(',').map(Number);
      const placeholders = ids.map(() => '?').join(',');
      const questions = await queryAsync(
        `SELECT * FROM tbl_quiz_questions WHERE question_id IN (${placeholders}) AND is_active = 1`,
        ids
      );
      // เรียงตาม order เดิม
      const ordered = ids.map(id => questions.find(q => q.question_id === id)).filter(Boolean);
      return res.json({
        already_played: existing.completed === 1,
        session_id: existing.session_id,
        score: existing.score,
        questions: existing.completed === 1 ? [] : ordered,
        reset_at: getNextMidnight(),
      });
    }

    // ยังไม่มี — สุ่ม 5 คำถาม
    const allQ = await queryAsync(
      'SELECT question_id FROM tbl_quiz_questions WHERE is_active = 1'
    );
    if (allQ.length === 0)
      return res.status(404).json({ error: 'ยังไม่มีคำถามในระบบ' });

    // shuffle และเลือก min(5, total)
    const shuffled = allQ.sort(() => Math.random() - 0.5);
    const picked   = shuffled.slice(0, Math.min(5, shuffled.length));
    const ids      = picked.map(r => r.question_id);

    // บันทึก session
    const result = await queryAsync(
      'INSERT INTO tbl_quiz_daily_sessions (user_id, quiz_date, question_ids) VALUES (?, ?, ?)',
      [user_id, today, ids.join(',')]
    );

    const questions = await queryAsync(
      `SELECT * FROM tbl_quiz_questions WHERE question_id IN (${ids.map(()=>'?').join(',')})`,
      ids
    );
    const ordered = ids.map(id => questions.find(q => q.question_id === id)).filter(Boolean);

    res.json({
      already_played: false,
      session_id: result.insertId,
      questions: ordered,
      reset_at: getNextMidnight(),
    });
  } catch (err) {
    console.error('Quiz daily error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /quiz/daily/complete — บันทึกผลเมื่อเล่นจบ
app.post('/quiz/daily/complete', verifyToken, async (req, res) => {
  const user_id = req.user_id;
  const { session_id, score } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    const [session] = await queryAsync(
      'SELECT * FROM tbl_quiz_daily_sessions WHERE session_id = ? AND user_id = ? AND quiz_date = ?',
      [session_id, user_id, today]
    );
    if (!session) return res.status(404).json({ error: 'ไม่พบ session' });
    if (session.completed) return res.json({ success: true, already_completed: true, score: session.score });

    // mark complete + บันทึก score
    await queryAsync(
      'UPDATE tbl_quiz_daily_sessions SET completed = 1, score = ? WHERE session_id = ?',
      [score, session_id]
    );

    // เพิ่มแต้มให้ user
    if (score > 0) {
      await queryAsync(
        'UPDATE tbl_users SET current_points = current_points + ?, points_expiry_date = DATE_ADD(NOW(), INTERVAL 4 YEAR) WHERE user_id = ?',
        [score, user_id]
      );
    }

    const [updated] = await queryAsync('SELECT current_points FROM tbl_users WHERE user_id = ?', [user_id]);
    res.json({ success: true, score, total_points: updated?.current_points || 0, reset_at: getNextMidnight() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getNextMidnight() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ══════════════════════════════════════════════════════════════════
// ADMIN — QUIZ QUESTIONS MANAGEMENT
// ══════════════════════════════════════════════════════════════════

// GET all quiz questions
app.get('/admin/quiz-questions', verifyAdmin, (req, res) => {
  db.query('SELECT * FROM tbl_quiz_questions ORDER BY question_id ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST add quiz question
app.post('/admin/quiz-questions', verifyAdmin, (req, res) => {
  const { question, option_a, option_b, option_c, option_d, correct_answer, points } = req.body;
  if (!question || option_a == null || option_b == null || option_c == null || option_d == null || correct_answer == null)
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
  db.query(
    'INSERT INTO tbl_quiz_questions (question,option_a,option_b,option_c,option_d,correct_answer,points) VALUES (?,?,?,?,?,?,?)',
    [question, option_a, option_b, option_c, option_d, Number(correct_answer), Number(points) || 10],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, question_id: result.insertId });
    }
  );
});

// PUT toggle quiz question active
app.put('/admin/quiz-questions/:id', verifyAdmin, (req, res) => {
  const { is_active } = req.body;
  db.query('UPDATE tbl_quiz_questions SET is_active = ? WHERE question_id = ?',
    [is_active ? 1 : 0, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
});

// DELETE quiz question
app.delete('/admin/quiz-questions/:id', verifyAdmin, (req, res) => {
  db.query('DELETE FROM tbl_quiz_questions WHERE question_id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Public: fetch active quiz questions (used by GameQuiz)
app.get('/quiz-questions', (req, res) => {
  db.query('SELECT * FROM tbl_quiz_questions WHERE is_active = 1 ORDER BY question_id ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ══════════════════════════════════════════════════════════════════
// ADMIN — QUEST MANAGEMENT
// ══════════════════════════════════════════════════════════════════

// GET all quests for admin
app.get('/admin/quests', verifyAdmin, (req, res) => {
  db.query('SELECT * FROM tbl_quests ORDER BY quest_id ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET shops list for admin quest creation
app.get('/admin/shops-list', verifyAdmin, (req, res) => {
  db.query(
    `SELECT s.shop_id, s.market_id, COALESCE(e.shop_name, CONCAT('ร้าน #', s.shop_id)) AS shop_name,
            m.name AS market_name
     FROM tbl_shops s
     JOIN tbl_entrepreneurs e ON s.entrepreneur_id = e.entrepreneurs_id
     LEFT JOIN tbl_floating_markets m ON s.market_id = m.market_id
     WHERE s.status = 'Open'
     ORDER BY m.name, shop_name`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(Array.isArray(rows) ? rows : []);
    }
  );
});

// POST add quest
app.post('/admin/quests', verifyAdmin, (req, res) => {
  const { name, description, quest_type, target_value, points_reward, icon, market_id, shop_id } = req.body;
  if (!name || !quest_type || !target_value)
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
  db.query(
    'INSERT INTO tbl_quests (name,description,quest_type,target_value,points_reward,icon,market_id,shop_id) VALUES (?,?,?,?,?,?,?,?)',
    [name, description || '', quest_type, Number(target_value), Number(points_reward) || 50, icon || '🎯', market_id || null, shop_id || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, quest_id: result.insertId });
    }
  );
});

// PUT edit quest
app.put('/admin/quests/:id', verifyAdmin, (req, res) => {
  const { name, description, quest_type, target_value, points_reward, icon, is_active, market_id, shop_id } = req.body;
  db.query(
    'UPDATE tbl_quests SET name=?,description=?,quest_type=?,target_value=?,points_reward=?,icon=?,is_active=?,market_id=?,shop_id=? WHERE quest_id=?',
    [name, description, quest_type, Number(target_value), Number(points_reward), icon, is_active ? 1 : 0, market_id || null, shop_id || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// DELETE quest
app.delete('/admin/quests/:id', verifyAdmin, (req, res) => {
  db.query('DELETE FROM tbl_quests WHERE quest_id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// GET game enabled status (public, used by GamePage)
app.get('/settings/game', (req, res) => {
  db.query('SELECT setting_value FROM tbl_settings WHERE setting_key = ?', ['game_enabled'], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const enabled = rows.length ? rows[0].setting_value === '1' : true;
    res.json({ game_enabled: enabled });
  });
});

// PUT game enabled (admin only)
app.put('/admin/settings/game', verifyAdmin, (req, res) => {
  const { game_enabled } = req.body;
  const val = game_enabled ? '1' : '0';
  db.query(
    'INSERT INTO tbl_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
    ['game_enabled', val, val],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, game_enabled: game_enabled ? true : false });
    }
  );
});

// ── Admin Shop Management ─────────────────────────────────────────────────────

// GET /admin/shops — all shops with market + entrepreneur info + product count
app.get('/admin/shops', verifyAdmin, (req, res) => {
  const sql = `
    SELECT s.shop_id, s.market_id, s.status, s.image_url,
           COALESCE(s.shop_name, e.shop_name) AS shop_name,
           e.entrepreneurs_id, e.category, e.phone_number,
           u.first_name, u.last_name, u.email,
           fm.name AS market_name,
           (SELECT COUNT(*) FROM tbl_products p WHERE p.shop_id = s.shop_id) AS product_count
    FROM tbl_shops s
    LEFT JOIN tbl_entrepreneurs e  ON s.entrepreneur_id = e.entrepreneurs_id
    LEFT JOIN tbl_users u          ON e.user_id         = u.user_id
    LEFT JOIN tbl_floating_markets fm ON s.market_id    = fm.market_id
    ORDER BY fm.name, s.shop_id
  `;
  db.query(sql, (err, rows) => {
    if (err) { console.error('admin/shops error:', err.message); return res.status(500).json({ error: err.message }); }
    res.json(rows || []);
  });
});

// POST /admin/shops — add a shop (link entrepreneur to market)
app.post('/admin/shops', verifyAdmin, (req, res) => {
  const { market_id, entrepreneur_id, shop_name, description, status } = req.body;
  if (!market_id || !entrepreneur_id) return res.status(400).json({ error: 'กรุณาเลือกตลาดน้ำและผู้ประกอบการ' });
  db.query(
    `INSERT INTO tbl_shops (market_id, entrepreneur_id, shop_name, description, status)
     VALUES (?, ?, ?, ?, ?)`,
    [market_id, entrepreneur_id, shop_name || null, description || null, status || 'Open'],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, shop_id: result.insertId });
    }
  );
});

// PUT /admin/shops/:shop_id/status — toggle Open/Closed
app.put('/admin/shops/:shop_id/status', verifyAdmin, (req, res) => {
  const { status } = req.body;
  if (!['Open', 'Closed'].includes(status)) return res.status(400).json({ error: 'status ต้องเป็น Open หรือ Closed' });
  db.query('UPDATE tbl_shops SET status = ? WHERE shop_id = ?', [status, req.params.shop_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// DELETE /admin/shops/:shop_id — remove shop (nullify FK refs first, then delete)
// Also removes the owning tbl_entrepreneurs row — otherwise the startup migration
// that backfills missing tbl_shops rows for every tbl_entrepreneurs row would
// silently recreate this shop the next time the server restarts/redeploys.
app.delete('/admin/shops/:shop_id', verifyAdmin, (req, res) => {
  const shop_id = req.params.shop_id;
  db.getConnection((connErr, conn) => {
    if (connErr) return res.status(500).json({ error: connErr.message });
    conn.beginTransaction(txErr => {
      if (txErr) { conn.release(); return res.status(500).json({ error: txErr.message }); }

      const rollback = (e) => conn.rollback(() => { conn.release(); res.status(500).json({ error: e.message }); });

      conn.query('SELECT entrepreneur_id FROM tbl_shops WHERE shop_id = ?', [shop_id], (e0, shopRows) => {
        if (e0) return rollback(e0);
        const entrepreneur_id = shopRows[0]?.entrepreneur_id || null;

        // 1. รักษาประวัติออเดอร์ไว้ แค่ตัด FK ออก
        conn.query('UPDATE tbl_orders SET shop_id = NULL WHERE shop_id = ?', [shop_id], (e1) => {
          if (e1) return rollback(e1);

          // 2. รักษาสินค้าไว้ (ยังมีใน order_items) แค่ตัด FK ออก
          conn.query('UPDATE tbl_products SET shop_id = NULL WHERE shop_id = ?', [shop_id], (e2) => {
            if (e2) return rollback(e2);

            // 3. ลบ reviews ของร้านนี้
            conn.query('DELETE FROM tbl_shop_reviews WHERE shop_id = ?', [shop_id], (e3) => {
              if (e3) return rollback(e3);

              // 4. ลบร้านค้า
              conn.query('DELETE FROM tbl_shops WHERE shop_id = ?', [shop_id], (e4) => {
                if (e4) return rollback(e4);

                // 5. ลบผู้ประกอบการเจ้าของร้านนี้ (กันไม่ให้ migration ตอนบูตสร้างร้านนี้กลับมาใหม่)
                const finish = (e5) => {
                  if (e5) return rollback(e5);
                  conn.commit(commitErr => {
                    conn.release();
                    if (commitErr) return res.status(500).json({ error: commitErr.message });
                    res.json({ success: true });
                  });
                };

                if (entrepreneur_id) {
                  conn.query('DELETE FROM tbl_entrepreneurs WHERE entrepreneurs_id = ?', [entrepreneur_id], finish);
                } else {
                  finish(null);
                }
              });
            });
          });
        });
      });
    });
  });
});

// GET /admin/verified-entrepreneurs — approved entrepreneurs without a shop in a given market
app.get('/admin/verified-entrepreneurs', verifyAdmin, (req, res) => {
  db.query(
    `SELECT e.entrepreneurs_id, e.shop_name, e.category, u.first_name, u.last_name, u.email
     FROM tbl_entrepreneurs e
     LEFT JOIN tbl_users u ON e.user_id = u.user_id
     WHERE e.is_verified = 1
     ORDER BY e.shop_name`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// ══ ADMIN COUPON / REWARD MANAGEMENT ════════════════════════════════════════

// GET /admin/rewards — all rewards (including inactive)
app.get('/admin/rewards', verifyAdmin, (req, res) => {
  const sql = `
    SELECT r.reward_id, r.name, r.description, r.points_required, r.coupon_code,
           r.is_active, r.max_redemptions, r.expiration_date, r.discount_amount,
           COUNT(rh.redeem_id) AS total_redeemed
    FROM tbl_rewards r
    LEFT JOIN tbl_redemption_history rh ON rh.reward_id = r.reward_id
    GROUP BY r.reward_id
    ORDER BY r.reward_id DESC`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// POST /admin/rewards — create reward
app.post('/admin/rewards', verifyAdmin, (req, res) => {
  const { name, description, points_required, coupon_code, max_redemptions, expiration_date, discount_amount } = req.body;
  if (!name || !points_required || !coupon_code) {
    return res.status(400).json({ error: 'name, points_required, coupon_code are required' });
  }
  const sql = `INSERT INTO tbl_rewards (name, description, points_required, coupon_code, max_redemptions, expiration_date, discount_amount, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1)`;
  db.query(sql, [name, description || '', points_required, coupon_code, max_redemptions || null, expiration_date || null, discount_amount || 0], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ reward_id: result.insertId, message: 'Created' });
  });
});

// PUT /admin/rewards/:id — update reward
app.put('/admin/rewards/:id', verifyAdmin, (req, res) => {
  const { name, description, points_required, coupon_code, max_redemptions, expiration_date, discount_amount, is_active } = req.body;
  const sql = `UPDATE tbl_rewards SET name=?, description=?, points_required=?, coupon_code=?,
               max_redemptions=?, expiration_date=?, discount_amount=?, is_active=?
               WHERE reward_id=?`;
  db.query(sql, [name, description || '', points_required, coupon_code, max_redemptions || null, expiration_date || null, discount_amount || 0, is_active ? 1 : 0, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Updated' });
  });
});

// DELETE /admin/rewards/:id — delete reward (nullify FK ref in redemption history first, then delete)
app.delete('/admin/rewards/:id', verifyAdmin, (req, res) => {
  const reward_id = req.params.id;
  db.getConnection((connErr, conn) => {
    if (connErr) return res.status(500).json({ error: connErr.message });
    conn.beginTransaction(txErr => {
      if (txErr) { conn.release(); return res.status(500).json({ error: txErr.message }); }

      const rollback = (e) => conn.rollback(() => { conn.release(); res.status(500).json({ error: e.message }); });

      // รักษาประวัติการแลกคะแนนไว้ แค่ตัด FK ออก
      conn.query('UPDATE tbl_redemption_history SET reward_id = NULL WHERE reward_id = ?', [reward_id], (e1) => {
        if (e1) return rollback(e1);

        conn.query('DELETE FROM tbl_rewards WHERE reward_id = ?', [reward_id], (e2) => {
          if (e2) return rollback(e2);

          conn.commit(commitErr => {
            conn.release();
            if (commitErr) return res.status(500).json({ error: commitErr.message });
            res.json({ message: 'Deleted' });
          });
        });
      });
    });
  });
});

// GET /admin/coupon-usage — usage history for all coupons
app.get('/admin/coupon-usage', verifyAdmin, (req, res) => {
  const sql = `
    SELECT cu.usage_id, cu.coupon_code, cu.discount_amount, cu.order_id,
           cu.redeem_id, u.first_name, u.last_name, u.email,
           r.name AS reward_name
    FROM tbl_coupon_usage cu
    LEFT JOIN tbl_users u ON cu.user_id = u.user_id
    LEFT JOIN tbl_rewards r ON CONVERT(r.coupon_code USING utf8mb4) = CONVERT(cu.coupon_code USING utf8mb4)
    ORDER BY cu.usage_id DESC
    LIMIT 200`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// ══ END ADMIN COUPON / REWARD MANAGEMENT ════════════════════════════════════

// ── เริ่ม server — ฟัง PORT จาก env (Railway ใช้ process.env.PORT) ──────────
const DEFAULT_PORT = Number(process.env.PORT) || 3000;

const startServer = (port) => {
  const onError = (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`⚠️ Port ${port} is busy, trying ${nextPort}...`);
      httpServer.off('error', onError);
      startServer(nextPort);
      return;
    }

    console.error('❌ Failed to start server:', err);
    process.exit(1);
  };

  httpServer.once('error', onError);
  httpServer.listen(port, '0.0.0.0', () => {
    console.log('');
    console.log('════════════════════════════════════════');
    console.log('  🚀 LongLoy Server Started');
    console.log('════════════════════════════════════════');
    console.log(`  📍 URL: http://localhost:${port}`);
    console.log('  🌐 CORS Enabled');
    console.log('  📦 Static folder: /uploads');
    console.log('  🔴 Socket.io Ready');
    console.log('════════════════════════════════════════');
    console.log('');
  });
};

startServer(DEFAULT_PORT);