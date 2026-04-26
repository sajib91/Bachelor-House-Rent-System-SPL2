-- Safe migration script for existing MySQL databases.
-- Purpose: align legacy schemas to the current SQL-backed backend models.

CREATE DATABASE IF NOT EXISTS to_let_globe;
USE to_let_globe;

DELIMITER $$

DROP PROCEDURE IF EXISTS ensure_column $$
CREATE PROCEDURE ensure_column(
  IN p_table VARCHAR(128),
  IN p_column VARCHAR(128),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND column_name = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DROP PROCEDURE IF EXISTS ensure_index $$
CREATE PROCEDURE ensure_index(
  IN p_table VARCHAR(128),
  IN p_index VARCHAR(128),
  IN p_ddl TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND index_name = p_index
  ) THEN
    SET @sql = p_ddl;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DELIMITER ;

-- Users table alignment
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
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CALL ensure_column('users', 'verificationStatus', "VARCHAR(50)");
CALL ensure_column('users', 'verificationType', "VARCHAR(100)");
CALL ensure_column('users', 'verificationDocumentUrl', "TEXT");
CALL ensure_column('users', 'verificationToken', "VARCHAR(255)");
CALL ensure_column('users', 'verificationTokenExpires', "TIMESTAMP NULL");
CALL ensure_column('users', 'passwordResetToken', "VARCHAR(255)");
CALL ensure_column('users', 'passwordResetExpires', "TIMESTAMP NULL");
CALL ensure_column('users', 'passwordResetOtp', "VARCHAR(64)");
CALL ensure_column('users', 'passwordResetOtpExpires', "TIMESTAMP NULL");
CALL ensure_column('users', 'passwordResetOtpRequestedAt', "TIMESTAMP NULL");
CALL ensure_column('users', 'passwordResetOtpRequestCount', "INT DEFAULT 0");
CALL ensure_column('users', 'passwordResetOtpWindowStartedAt', "TIMESTAMP NULL");
CALL ensure_column('users', 'profileSummary', "TEXT");
CALL ensure_column('users', 'instituteType', "VARCHAR(80)");
CALL ensure_column('users', 'instituteName', "VARCHAR(160)");
CALL ensure_column('users', 'hometown', "VARCHAR(120)");
CALL ensure_column('users', 'profilePictureUrl', "TEXT");
CALL ensure_column('users', 'verificationFeedback', "TEXT");
CALL ensure_column('users', 'verificationReviewedAt', "TIMESTAMP NULL");

-- Ensure OTP hash length matches current implementation.
ALTER TABLE users MODIFY COLUMN passwordResetOtp VARCHAR(64);

CALL ensure_index('users', 'idx_email', 'CREATE INDEX idx_email ON users (email)');
CALL ensure_index('users', 'idx_username', 'CREATE INDEX idx_username ON users (username)');
CALL ensure_index('users', 'idx_role', 'CREATE INDEX idx_role ON users (role)');

-- Properties table alignment
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
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CALL ensure_column('properties', 'seatApplications', "JSON");
CALL ensure_column('properties', 'rentPayments', "JSON");
CALL ensure_column('properties', 'messages', "JSON");
CALL ensure_column('properties', 'reviews', "JSON");
CALL ensure_column('properties', 'landlordNagad', "VARCHAR(20)");
CALL ensure_column('properties', 'mapLatitude', "DECIMAL(10, 8)");
CALL ensure_column('properties', 'mapLongitude', "DECIMAL(11, 8)");
CALL ensure_column('properties', 'mapLabel', "VARCHAR(255)");
CALL ensure_column('properties', 'mapLink', "TEXT");
CALL ensure_column('properties', 'universityProximity', "VARCHAR(100)");
CALL ensure_column('properties', 'commuteMinutes', "INT");
CALL ensure_column('properties', 'rentalMonth', "VARCHAR(50)");

CALL ensure_index('properties', 'idx_landlordId', 'CREATE INDEX idx_landlordId ON properties (landlordId)');
CALL ensure_index('properties', 'idx_isActive', 'CREATE INDEX idx_isActive ON properties (isActive)');
CALL ensure_index('properties', 'idx_publicationStatus', 'CREATE INDEX idx_publicationStatus ON properties (publicationStatus)');

-- Blogs table alignment (legacy blog fields may coexist)
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
);

CALL ensure_column('blogs', 'name', "VARCHAR(255) NOT NULL DEFAULT 'Unknown Author'");
CALL ensure_column('blogs', 'role', "VARCHAR(120) NOT NULL DEFAULT 'Content Creator'");
CALL ensure_column('blogs', 'category', "VARCHAR(120) NOT NULL DEFAULT 'General'");
CALL ensure_column('blogs', 'intro', "TEXT");
CALL ensure_column('blogs', 'imageUrl', "TEXT");
CALL ensure_column('blogs', 'views', "INT DEFAULT 0");
CALL ensure_column('blogs', 'likes', "INT DEFAULT 0");

CALL ensure_index('blogs', 'idx_blog_created', 'CREATE INDEX idx_blog_created ON blogs (createdAt)');
CALL ensure_index('blogs', 'idx_blog_likes', 'CREATE INDEX idx_blog_likes ON blogs (likes)');
CALL ensure_index('blogs', 'idx_blog_views', 'CREATE INDEX idx_blog_views ON blogs (views)');

-- Contacts table alignment
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  topic VARCHAR(80) NOT NULL,
  message LONGTEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CALL ensure_column('contacts', 'topic', "VARCHAR(80) NOT NULL DEFAULT 'General Inquiry'");
CALL ensure_index('contacts', 'idx_contact_email', 'CREATE INDEX idx_contact_email ON contacts (email)');

-- Intelligence settings table used by admin intelligence thresholds.
CREATE TABLE IF NOT EXISTS intelligence_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  settingKey VARCHAR(64) NOT NULL UNIQUE,
  thresholds JSON,
  updatedBy VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cleanup helper procedures.
DROP PROCEDURE IF EXISTS ensure_index;
DROP PROCEDURE IF EXISTS ensure_column;
