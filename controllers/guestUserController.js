const { pool } = require('../db');

const guestUserFields = `
  guest_id AS "guestId", email, full_name AS "fullName", phone, company,
  location, inquiry_type AS "inquiryType", project_context AS "projectContext",
  created_at AS "createdAt", status, is_read AS "isRead"
`;

const registerGuestUser = async (req, res) => {
  try {
    const { email, fullName, phone, company, location, inquiryType, projectContext } = req.body;
    if (!email || !fullName) return res.status(400).json({ error: 'Email and Full Name are required' });
    const result = await pool.query(
      `INSERT INTO guest_users (email, full_name, phone, company, location, inquiry_type, project_context)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${guestUserFields}`,
      [email, fullName, phone || null, company || null, location || null, inquiryType || null, projectContext || null]
    );
    res.status(201).json({ message: 'Guest user registered successfully', data: result.rows[0] });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getGuestProfile = async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${guestUserFields} FROM guest_users WHERE guest_id = $1`, [req.params.guestId]);
    if (!result.rowCount) return res.status(404).json({ error: 'Guest user not found' });
    res.status(200).json({ message: 'Guest user profile retrieved successfully', data: result.rows[0] });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const updateGuestProfile = async (req, res) => {
  try {
    const fields = { email: 'email', fullName: 'full_name', phone: 'phone', company: 'company', location: 'location', inquiryType: 'inquiry_type', projectContext: 'project_context' };
    const updates = Object.entries(fields).filter(([field]) => req.body[field]);
    if (!updates.length) {
      const result = await pool.query(`SELECT ${guestUserFields} FROM guest_users WHERE guest_id = $1`, [req.params.guestId]);
      if (!result.rowCount) return res.status(404).json({ error: 'Guest user not found' });
      return res.status(200).json({ message: 'Guest user profile updated successfully', data: result.rows[0] });
    }
    const values = updates.map(([field]) => req.body[field]);
    values.push(req.params.guestId);
    const setClause = updates.map(([, column], index) => `${column} = $${index + 1}`).join(', ');
    const result = await pool.query(`UPDATE guest_users SET ${setClause} WHERE guest_id = $${values.length} RETURNING ${guestUserFields}`, values);
    if (!result.rowCount) return res.status(404).json({ error: 'Guest user not found' });
    res.status(200).json({ message: 'Guest user profile updated successfully', data: result.rows[0] });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const deleteGuestUser = async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM guest_users WHERE guest_id = $1 RETURNING ${guestUserFields}`, [req.params.guestId]);
    if (!result.rowCount) return res.status(404).json({ error: 'Guest user not found' });
    res.status(200).json({ message: 'Guest user deleted successfully', data: result.rows[0] });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getAllGuestUsers = async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${guestUserFields} FROM guest_users ORDER BY guest_id`);
    res.status(200).json({ message: 'All guest users retrieved successfully', count: result.rowCount, data: result.rows });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = { registerGuestUser, getGuestProfile, updateGuestProfile, deleteGuestUser, getAllGuestUsers };
