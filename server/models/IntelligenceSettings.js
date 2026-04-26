const { getPool } = require('../config/sqlPool');

const hydrate = (row) => {
  if (!row) return null;

  let thresholds = {};
  if (row.thresholds) {
    try {
      thresholds = typeof row.thresholds === 'string' ? JSON.parse(row.thresholds) : row.thresholds;
    } catch (error) {
      thresholds = {};
    }
  }

  return {
    _id: String(row.id),
    id: row.id,
    key: row.settingKey,
    thresholds,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

class IntelligenceSettings {
  static async findOne(query = {}) {
    if (!query.key) return null;

    const [rows] = await getPool().query(
      'SELECT * FROM intelligence_settings WHERE settingKey = ? LIMIT 1',
      [query.key]
    );

    return hydrate(rows[0]);
  }

  static async upsertByKey(key, payload = {}) {
    const thresholdsJson = JSON.stringify(payload.thresholds || {});
    const updatedBy = payload.updatedBy ? String(payload.updatedBy) : null;

    await getPool().query(
      `INSERT INTO intelligence_settings (settingKey, thresholds, updatedBy)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         thresholds = VALUES(thresholds),
         updatedBy = VALUES(updatedBy),
         updatedAt = CURRENT_TIMESTAMP`,
      [key, thresholdsJson, updatedBy]
    );

    return this.findOne({ key });
  }
}

module.exports = IntelligenceSettings;
