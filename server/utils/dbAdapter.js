const getDbClient = require('../config/dbClient');

const hasPostgresDatabase = () => Boolean(process.env.DATABASE_URL);

const getDbAdapter = () => {
  return {
    mode: 'postgresql',
    db: getDbClient(),
  };
};

module.exports = {
  hasPostgresDatabase,
  getDbAdapter,
};