const mysql = require('mysql2/promise');

let pool;

const USERS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  fullName VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phoneNumber VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  role ENUM('Tenant', 'Landlord', 'Admin', 'Content_Creator', 'Owner', 'User') DEFAULT 'Tenant',
  isVerified BOOLEAN DEFAULT FALSE,
  verificationStatus VARCHAR(50),
  verificationType VARCHAR(100),
  verificationDocumentUrl TEXT,
  verificationToken VARCHAR(255),
  verificationTokenExpires TIMESTAMP NULL,
  passwordResetToken VARCHAR(255),
  passwordResetExpires TIMESTAMP NULL,
  passwordResetOtp VARCHAR(64),
  passwordResetOtpExpires TIMESTAMP NULL,
  passwordResetOtpRequestedAt TIMESTAMP NULL,
  passwordResetOtpRequestCount INT DEFAULT 0,
  passwordResetOtpWindowStartedAt TIMESTAMP NULL,
  profileSummary TEXT,
  instituteType VARCHAR(80),
  instituteName VARCHAR(160),
  hometown VARCHAR(120),
  profilePictureUrl TEXT,
  verificationFeedback TEXT,
  verificationReviewedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_role (role)
)
`;

const PROPERTIES_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  landlordId INT NOT NULL,
  landlordName VARCHAR(255),
  landlordPhone VARCHAR(20),
  landlordWhatsapp VARCHAR(20),
  landlordBkash VARCHAR(20),
  landlordNagad VARCHAR(20),
  title VARCHAR(255) NOT NULL,
  area VARCHAR(100),
  nearbyUniversity VARCHAR(255),
  address TEXT,
  mapLatitude DECIMAL(10, 8),
  mapLongitude DECIMAL(11, 8),
  mapLabel VARCHAR(255),
  mapLink TEXT,
  totalSeats INT DEFAULT 0,
  availableSeats INT DEFAULT 0,
  genderPreference VARCHAR(50),
  roomType VARCHAR(100),
  monthlyRentPerSeat DECIMAL(12, 2),
  securityDeposit DECIMAL(12, 2),
  mealSystem VARCHAR(100),
  amenities JSON,
  gateClosingTime TIME,
  guestPolicy TEXT,
  smokingRules TEXT,
  attachedBath BOOLEAN DEFAULT FALSE,
  filteredWater BOOLEAN DEFAULT FALSE,
  lift BOOLEAN DEFAULT FALSE,
  wifi BOOLEAN DEFAULT FALSE,
  photos JSON,
  description TEXT,
  universityProximity VARCHAR(100),
  commuteMinutes INT,
  rentalMonth VARCHAR(50),
  isActive BOOLEAN DEFAULT TRUE,
  publicationStatus VARCHAR(50),
  views INT DEFAULT 0,
  seatApplications JSON,
  rentPayments JSON,
  messages JSON,
  reviews JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_landlordId (landlordId),
  INDEX idx_isActive (isActive),
  INDEX idx_publicationStatus (publicationStatus)
)
`;

const BLOGS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS blogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(120) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(120) NOT NULL,
  intro TEXT NOT NULL,
  imageUrl TEXT,
  content LONGTEXT NOT NULL,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
`;

const CONTACTS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  topic VARCHAR(80) NOT NULL,
  message LONGTEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contact_email (email)
)
`;

const INTELLIGENCE_SETTINGS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS intelligence_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  settingKey VARCHAR(64) NOT NULL UNIQUE,
  thresholds JSON,
  updatedBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
`;

const getNumericEnv = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const buildConfig = () => ({
  host: process.env.DB_HOST || '127.0.0.1',
  port: getNumericEnv('DB_PORT', 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'to_let_globe',
  waitForConnections: true,
  connectionLimit: getNumericEnv('DB_CONNECTION_LIMIT', 10),
  queueLimit: 0,
  timezone: 'Z',
});

const ensureDatabaseAndUsersTable = async () => {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = getNumericEnv('DB_PORT', 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'to_let_globe';

  const adminConnection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    timezone: 'Z',
  });

  try {
    await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  } finally {
    await adminConnection.end();
  }

  const bootstrapConnection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    timezone: 'Z',
  });

  try {
    await bootstrapConnection.query(USERS_TABLE_DDL);
    await bootstrapConnection.query(PROPERTIES_TABLE_DDL);
    await bootstrapConnection.query(BLOGS_TABLE_DDL);
    await bootstrapConnection.query(CONTACTS_TABLE_DDL);
    await bootstrapConnection.query(INTELLIGENCE_SETTINGS_TABLE_DDL);
  } finally {
    await bootstrapConnection.end();
  }
};

const initPool = () => {
  if (!pool) {
    pool = mysql.createPool(buildConfig());
  }
  return pool;
};

const getPool = () => initPool();

module.exports = {
  ensureDatabaseAndUsersTable,
  initPool,
  getPool,
};
