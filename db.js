const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'appixo_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

const pool = new Pool(poolConfig);

const defaultAdmin = {
  username: process.env.DEFAULT_ADMIN_USER || 'admin',
  password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@appixo.com',
  fullName: process.env.DEFAULT_ADMIN_NAME || 'Administrator',
  role: 'super_admin'
};

const initializeDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      admin_id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status VARCHAR(30) NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS guest_users (
      guest_id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      company VARCHAR(255),
      location VARCHAR(255),
      inquiry_type VARCHAR(100),
      project_context TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status VARCHAR(30) NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      session_id VARCHAR(100) PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES admins(admin_id) ON DELETE CASCADE,
      username VARCHAR(100) NOT NULL,
      login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);

  await pool.query(
    `INSERT INTO admins (username, password, email, full_name, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (username) DO UPDATE
     SET password = EXCLUDED.password,
         email = EXCLUDED.email,
         full_name = EXCLUDED.full_name;`,
    [
      defaultAdmin.username,
      defaultAdmin.password,
      defaultAdmin.email,
      defaultAdmin.fullName,
      defaultAdmin.role
    ]
  );

  console.log(`✅ Database tables initialized successfully.`);
  console.log(`🔑 Admin dummy credentials ready:`);
  console.log(`   - Username: ${defaultAdmin.username}`);
  console.log(`   - Password: ${defaultAdmin.password}`);
};

module.exports = { pool, initializeDatabase, defaultAdmin };
