const dotenv = require('dotenv');
const { ensureDatabaseAndUsersTable, initPool } = require('./sqlPool');

dotenv.config();

const connectDB = async () => {
  try {
    await ensureDatabaseAndUsersTable();
    const pool = initPool();
    await pool.query('SELECT 1');
    const dbName = process.env.DB_NAME || 'to_let_globe';
    const host = process.env.DB_HOST || '127.0.0.1';
    console.log(`MySQL Connected: ${host}/${dbName}`);
  } catch (error) {
    console.error(`Error connecting to MySQL: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;