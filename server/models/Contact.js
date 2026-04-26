const { getPool } = require('../config/sqlPool');

const EMAIL_REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
const ALLOWED_TOPICS = ['General Inquiry', 'Technical Support', 'Partnership', 'Other'];

const hydrate = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    topic: row.topic,
    message: row.message,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const validatePayload = (payload = {}) => {
  const errors = [];

  if (!payload.name || !String(payload.name).trim()) {
    errors.push('Name is required');
  }

  if (!payload.email || !EMAIL_REGEX.test(String(payload.email).trim())) {
    errors.push('Please enter a valid email address');
  }

  if (!payload.topic || !ALLOWED_TOPICS.includes(payload.topic)) {
    errors.push('Invalid topic selected');
  }

  if (!payload.message || !String(payload.message).trim()) {
    errors.push('Message is required');
  } else if (String(payload.message).length > 500) {
    errors.push('Message cannot exceed 500 characters');
  }

  return errors;
};

class Contact {
  static async create(payload = {}) {
    const errors = validatePayload(payload);
    if (errors.length > 0) {
      const err = new Error('Validation failed');
      err.name = 'ValidationError';
      err.errors = errors.map((message) => ({ message }));
      throw err;
    }

    const [result] = await getPool().query(
      `INSERT INTO contacts (name, email, phone, topic, message)
       VALUES (?, ?, ?, ?, ?)`,
      [
        String(payload.name).trim(),
        String(payload.email).trim().toLowerCase(),
        payload.phone ? String(payload.phone).trim() : null,
        payload.topic,
        String(payload.message).trim(),
      ]
    );

    const [rows] = await getPool().query('SELECT * FROM contacts WHERE id = ? LIMIT 1', [result.insertId]);
    return hydrate(rows[0]);
  }
}

module.exports = Contact;
