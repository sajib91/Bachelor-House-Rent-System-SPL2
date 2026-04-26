const { ensureDatabaseAndUsersTable, getPool } = require('./config/sqlPool');

beforeAll(async () => {
  await ensureDatabaseAndUsersTable();
  const pool = getPool();
  await pool.query('SELECT 1');
});

afterEach(async () => {
  const pool = getPool();
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  const pool = getPool();
  await pool.end();
});