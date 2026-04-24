const dotenv = require('dotenv');
const path = require('path');
const os = require('os');
const getDbClient = require('./dbClient');
const { setDbConnectionString, getDbConnectionString } = require('./dbClient');

const buildFallbackConnectionString = () => {
  const current = getDbConnectionString();
  if (!current) return null;

  try {
    const parsed = new URL(current);
    const fallbackUser = process.env.PGUSER || process.env.DB_USER || os.userInfo().username;

    if (!fallbackUser || fallbackUser === parsed.username || parsed.hostname !== 'localhost') {
      return null;
    }

    parsed.username = fallbackUser;
    parsed.password = process.env.PGPASSWORD || process.env.DB_PASSWORD || '';
    return parsed.toString();
  } catch (error) {
    return null;
  }
};

dotenv.config({ path: path.resolve(__dirname, '..', '.env') }); // Load the server .env file explicitly

const connectDB = async () => {
  try {
    const db = getDbClient();
    await db.$connect();
    console.log('PostgreSQL database connection established');
    return db;
  } catch (error) {
    console.error(`Error connecting to PostgreSQL: ${error.message}`);

    const fallbackConnectionString = buildFallbackConnectionString();
    if (fallbackConnectionString) {
      try {
        setDbConnectionString(fallbackConnectionString);
        const fallbackDb = getDbClient();
        await fallbackDb.$connect();
        console.warn('PostgreSQL fallback connection established using a local user.');
        return fallbackDb;
      } catch (fallbackError) {
        console.error(`Fallback PostgreSQL connection failed: ${fallbackError.message}`);
      }
    }

    return null;
  }
};

module.exports = connectDB;