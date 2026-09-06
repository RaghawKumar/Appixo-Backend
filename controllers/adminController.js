const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const jwtSecret = process.env.JWT_SECRET || 'appixo-development-secret-change-me';

const enquiryFields = `
  guest_id AS "enquiryId", full_name AS "fullName", email, phone, company,
  location, inquiry_type AS "inquiryType", project_context AS "projectContext",
  created_at AS "submittedAt", status, is_read AS "isRead"
`;

const getToken = req => {
  const authorization = req.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
};

const verifyAdminToken = token => {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
};

const requireSession = async (req, res) => {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Bearer token required' });
    return null;
  }
  const session = verifyAdminToken(token);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return null;
  }
  return session;
};

const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    const adminResult = await pool.query(
      `SELECT admin_id AS "adminId", username, full_name AS "fullName", role
       FROM admins WHERE username = $1 AND password = $2 AND status = 'active'`,
      [username, password]
    );
    if (!adminResult.rowCount) return res.status(401).json({ error: 'Invalid username or password' });

    const admin = adminResult.rows[0];
    const token = jwt.sign(
      { adminId: admin.adminId, username: admin.username, role: admin.role },
      jwtSecret,
      { expiresIn: '24h' }
    );
    const decodedToken = jwt.decode(token);
    res.status(200).json({
      message: 'Login successful',
      data: { ...admin, token, expiresAt: new Date(decodedToken.exp * 1000) }
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const adminLogout = async (req, res) => {
  try {
    const token = getToken(req) || req.body.token;
    if (!token || !verifyAdminToken(token)) return res.status(401).json({ error: 'Invalid or missing token' });
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getEnquiriesList = async (req, res) => {
  try {
    const session = await requireSession(req, res);
    if (!session) return;
    const result = await pool.query(`SELECT ${enquiryFields} FROM guest_users ORDER BY guest_id`);
    res.status(200).json({
      message: 'Enquiries list retrieved successfully', count: result.rowCount,
      admin: { adminId: session.adminId, username: session.username }, data: result.rows
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getEnquiryDetails = async (req, res) => {
  try {
    const session = await requireSession(req, res);
    if (!session) return;
    const result = await pool.query(
      `UPDATE guest_users SET is_read = TRUE WHERE guest_id = $1 RETURNING ${enquiryFields}`,
      [req.params.enquiryId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Enquiry not found' });
    res.status(200).json({
      message: 'Enquiry details retrieved successfully',
      admin: { adminId: session.adminId, username: session.username }, data: result.rows[0]
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const updateEnquiryStatus = async (req, res) => {
  try {
    const session = await requireSession(req, res);
    if (!session) return;
    const validStatuses = ['pending', 'in-progress', 'resolved', 'closed'];
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const result = await pool.query(
      'UPDATE guest_users SET status = $1 WHERE guest_id = $2 RETURNING guest_id AS "enquiryId"',
      [req.body.status, req.params.enquiryId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Enquiry not found' });
    res.status(200).json({
      message: 'Enquiry status updated successfully',
      admin: { adminId: session.adminId, username: session.username },
      data: { enquiryId: result.rows[0].enquiryId, newStatus: req.body.status, updatedAt: new Date() }
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const updateEnquiryReadStatus = async (req, res) => {
  try {
    const session = await requireSession(req, res);
    if (!session) return;

    let isRead = true;
    if (typeof req.body.isRead === 'boolean') {
      isRead = req.body.isRead;
    } else if (typeof req.body.read === 'boolean') {
      isRead = req.body.read;
    } else if (typeof req.body.isRead === 'string') {
      isRead = req.body.isRead.toLowerCase() === 'true';
    } else if (typeof req.body.read === 'string') {
      isRead = req.body.read.toLowerCase() === 'true';
    }

    const result = await pool.query(
      `UPDATE guest_users SET is_read = $1 WHERE guest_id = $2 RETURNING ${enquiryFields}`,
      [isRead, req.params.enquiryId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Enquiry not found' });
    res.status(200).json({
      message: `Enquiry marked as ${isRead ? 'read' : 'unread'} successfully`,
      admin: { adminId: session.adminId, username: session.username },
      data: result.rows[0]
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getAdminProfile = async (req, res) => {
  try {
    const session = await requireSession(req, res);
    if (!session) return;
    const result = await pool.query(
      `SELECT admin_id AS "adminId", username, email, full_name AS "fullName", role, status
       FROM admins WHERE admin_id = $1`,
      [session.adminId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Admin not found' });
    res.status(200).json({ message: 'Admin profile retrieved successfully', data: result.rows[0] });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = {
  adminLogin,
  adminLogout,
  getEnquiriesList,
  getEnquiryDetails,
  updateEnquiryStatus,
  updateEnquiryReadStatus,
  getAdminProfile,
  verifyAdminToken
};
