const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getPool } = require('../config/sqlPool');

const USER_COLUMNS = [
  'id',
  'username',
  'fullName',
  'email',
  'phoneNumber',
  'password',
  'role',
  'isVerified',
  'verificationStatus',
  'verificationType',
  'verificationDocumentUrl',
  'verificationToken',
  'verificationTokenExpires',
  'passwordResetToken',
  'passwordResetExpires',
  'passwordResetOtp',
  'passwordResetOtpExpires',
  'passwordResetOtpRequestedAt',
  'passwordResetOtpRequestCount',
  'passwordResetOtpWindowStartedAt',
  'profileSummary',
  'instituteType',
  'instituteName',
  'hometown',
  'profilePictureUrl',
  'verificationFeedback',
  'verificationReviewedAt',
  'createdAt',
  'updatedAt',
];

const hydrateUser = (row) => {
  if (!row) return null;

  const user = new User({
    id: row.id,
    username: row.username,
    fullName: row.fullName,
    email: row.email,
    phoneNumber: row.phoneNumber,
    password: row.password,
    role: row.role,
    isVerified: Boolean(row.isVerified),
    verificationStatus: row.verificationStatus,
    verificationType: row.verificationType,
    verificationDocumentUrl: row.verificationDocumentUrl,
    verificationToken: row.verificationToken,
    verificationTokenExpires: row.verificationTokenExpires,
    passwordResetToken: row.passwordResetToken,
    passwordResetExpires: row.passwordResetExpires,
    passwordResetOtp: row.passwordResetOtp,
    passwordResetOtpExpires: row.passwordResetOtpExpires,
    passwordResetOtpRequestedAt: row.passwordResetOtpRequestedAt,
    passwordResetOtpRequestCount: row.passwordResetOtpRequestCount,
    passwordResetOtpWindowStartedAt: row.passwordResetOtpWindowStartedAt,
    profileSummary: row.profileSummary,
    instituteType: row.instituteType,
    instituteName: row.instituteName,
    hometown: row.hometown,
    profilePictureUrl: row.profilePictureUrl,
    verificationFeedback: row.verificationFeedback,
    verificationReviewedAt: row.verificationReviewedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  user._id = String(row.id);
  user.__isNew = false;
  user.__loadedPasswordHash = row.password;
  return user;
};

class User {
  constructor(data = {}) {
    Object.assign(this, {
      id: data.id,
      _id: data.id ? String(data.id) : undefined,
      username: data.username,
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      password: data.password,
      role: data.role || 'Tenant',
      isVerified: Boolean(data.isVerified),
      verificationStatus: data.verificationStatus || 'Pending',
      verificationType: data.verificationType || 'Student ID',
      verificationDocumentUrl: data.verificationDocumentUrl,
      verificationToken: data.verificationToken,
      verificationTokenExpires: data.verificationTokenExpires,
      passwordResetToken: data.passwordResetToken,
      passwordResetExpires: data.passwordResetExpires,
      passwordResetOtp: data.passwordResetOtp,
      passwordResetOtpExpires: data.passwordResetOtpExpires,
      passwordResetOtpRequestedAt: data.passwordResetOtpRequestedAt,
      passwordResetOtpRequestCount: Number(data.passwordResetOtpRequestCount || 0),
      passwordResetOtpWindowStartedAt: data.passwordResetOtpWindowStartedAt,
      profileSummary: data.profileSummary,
      instituteType: data.instituteType,
      instituteName: data.instituteName,
      hometown: data.hometown,
      profilePictureUrl: data.profilePictureUrl,
      verificationFeedback: data.verificationFeedback,
      verificationReviewedAt: data.verificationReviewedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });

    this.__isNew = !data.id;
    this.__loadedPasswordHash = data.password;
  }

  static get pool() {
    return getPool();
  }

  static sanitize(user, includePassword = false) {
    if (!user) return null;
    const safeUser = { ...user };
    if (!includePassword) {
      delete safeUser.password;
    }
    return safeUser;
  }

  static async findOneByField(field, value, includePassword = false) {
    const columns = includePassword
      ? USER_COLUMNS.join(', ')
      : USER_COLUMNS.filter((column) => column !== 'password').join(', ');

    const [rows] = await this.pool.query(
      `SELECT ${columns} FROM users WHERE ${field} = ? LIMIT 1`,
      [value]
    );

    const hydrated = hydrateUser(rows[0]);
    if (!hydrated) return null;
    if (!includePassword) hydrated.password = undefined;
    return hydrated;
  }

  static async findOne(criteria = {}, options = {}) {
    const includePassword = Boolean(options.includePassword);

    if (criteria.email && !criteria.$or) {
      return this.findOneByField('email', criteria.email, includePassword);
    }

    if (criteria.username && !criteria.$or) {
      return this.findOneByField('username', criteria.username, includePassword);
    }

    if (criteria.phoneNumber && !criteria.$or) {
      return this.findOneByField('phoneNumber', criteria.phoneNumber, includePassword);
    }

    if (criteria.verificationToken) {
      const [rows] = await this.pool.query(
        `SELECT ${USER_COLUMNS.join(', ')}
         FROM users
         WHERE verificationToken = ?
           AND verificationTokenExpires IS NOT NULL
           AND verificationTokenExpires > NOW()
         LIMIT 1`,
        [criteria.verificationToken]
      );
      const hydrated = hydrateUser(rows[0]);
      if (!hydrated) return null;
      if (!includePassword) hydrated.password = undefined;
      return hydrated;
    }

    if (criteria.passwordResetToken) {
      const [rows] = await this.pool.query(
        `SELECT ${USER_COLUMNS.join(', ')}
         FROM users
         WHERE passwordResetToken = ?
           AND passwordResetExpires IS NOT NULL
           AND passwordResetExpires > NOW()
         LIMIT 1`,
        [criteria.passwordResetToken]
      );
      const hydrated = hydrateUser(rows[0]);
      if (!hydrated) return null;
      if (!includePassword) hydrated.password = undefined;
      return hydrated;
    }

    if (criteria.email && criteria.passwordResetOtp) {
      const [rows] = await this.pool.query(
        `SELECT ${USER_COLUMNS.join(', ')}
         FROM users
         WHERE email = ?
           AND passwordResetOtp = ?
           AND passwordResetOtpExpires IS NOT NULL
           AND passwordResetOtpExpires > NOW()
         LIMIT 1`,
        [criteria.email, criteria.passwordResetOtp]
      );
      const hydrated = hydrateUser(rows[0]);
      if (!hydrated) return null;
      if (!includePassword) hydrated.password = undefined;
      return hydrated;
    }

    if (Array.isArray(criteria.$or) && criteria.$or.length > 0) {
      const identifier = criteria.$or[0].email || criteria.$or[1]?.username || criteria.$or[2]?.phoneNumber;
      if (!identifier) return null;

      const columns = includePassword
        ? USER_COLUMNS.join(', ')
        : USER_COLUMNS.filter((column) => column !== 'password').join(', ');

      const [rows] = await this.pool.query(
        `SELECT ${columns}
         FROM users
         WHERE email = ? OR username = ? OR phoneNumber = ?
         LIMIT 1`,
        [identifier, identifier, identifier]
      );

      const hydrated = hydrateUser(rows[0]);
      if (!hydrated) return null;
      if (!includePassword) hydrated.password = undefined;
      return hydrated;
    }

    return null;
  }

  static async findById(id, options = {}) {
    const includePassword = Boolean(options.includePassword);
    const columns = includePassword
      ? USER_COLUMNS.join(', ')
      : USER_COLUMNS.filter((column) => column !== 'password').join(', ');

    const [rows] = await this.pool.query(
      `SELECT ${columns} FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    const hydrated = hydrateUser(rows[0]);
    if (!hydrated) return null;
    if (!includePassword) hydrated.password = undefined;
    return hydrated;
  }

  static find(criteria = {}) {
    const query = {
      async exec() {
        const [rows] = await User.pool.query(
          `SELECT ${USER_COLUMNS.filter((column) => column !== 'password').join(', ')} FROM users`
        );

        const filtered = rows.filter((row) => {
          if (criteria.role && criteria.role.$in) {
            return criteria.role.$in.includes(row.role);
          }
          return true;
        });

        return filtered.map((row) => {
          const user = hydrateUser(row);
          user.password = undefined;
          return user;
        });
      },
      select() {
        return this;
      },
      then(resolve, reject) {
        return this.exec().then(resolve, reject);
      },
    };

    return query;
  }

  static async findByIdAndUpdate(id, update = {}) {
    const user = await User.findById(id, { includePassword: true });
    if (!user) return null;
    Object.assign(user, update);
    await user.save();
    return user;
  }

  static async findPendingVerificationUsers() {
    const [rows] = await this.pool.query(
      `SELECT id, username, fullName, email, phoneNumber, role, verificationType,
              verificationDocumentUrl, verificationStatus, profilePictureUrl,
              instituteType, instituteName, hometown, createdAt
       FROM users
       WHERE verificationStatus = 'Pending'
         AND role IN ('Tenant', 'Landlord')
       ORDER BY createdAt DESC`
    );

    return rows.map((row) => ({
      ...row,
      _id: String(row.id),
      id: row.id,
    }));
  }

  static async findAllForAdmin({ role = '', search = '' } = {}) {
    const whereParts = ["id IS NOT NULL"];
    const params = [];

    if (role && ['Tenant', 'Landlord', 'Admin'].includes(role)) {
      whereParts.push('role = ?');
      params.push(role);
    }

    if (search) {
      const like = `%${String(search).trim()}%`;
      whereParts.push('(fullName LIKE ? OR username LIKE ? OR email LIKE ? OR phoneNumber LIKE ?)');
      params.push(like, like, like, like);
    }

    const [rows] = await this.pool.query(
      `SELECT id, username, fullName, email, phoneNumber, role, isVerified,
              verificationStatus, verificationType, verificationFeedback,
              instituteType, instituteName, hometown, createdAt, updatedAt
       FROM users
       WHERE ${whereParts.join(' AND ')}
       ORDER BY createdAt DESC`
      ,
      params
    );

    return rows.map((row) => ({
      ...row,
      _id: String(row.id),
      id: row.id,
      isVerified: Boolean(row.isVerified),
    }));
  }

  static async deleteById(id) {
    const [result] = await this.pool.query('DELETE FROM users WHERE id = ?', [id]);
    return Number(result.affectedRows || 0) > 0;
  }

  static async create(data) {
    if (Array.isArray(data)) {
      const created = [];
      for (const item of data) {
        const user = new User(item);
        await user.save();
        created.push(user);
      }
      return created;
    }

    const user = new User(data);
    await user.save();
    return user;
  }

  async comparePassword(enteredPassword) {
    if (!this.password) return false;
    return bcrypt.compare(enteredPassword, this.password);
  }

  getVerificationToken() {
    const verificationToken = crypto.randomBytes(20).toString('hex');
    this.verificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    this.verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
    return verificationToken;
  }

  async save() {
    const pool = getPool();

    if (!this.password && this.__isNew) {
      throw new Error('Password is required');
    }

    let passwordToPersist = this.password;
    if (!this.__isNew && !passwordToPersist) {
      passwordToPersist = this.__loadedPasswordHash;
    }

    if (!this.__isNew && !passwordToPersist && this.id) {
      const [rows] = await pool.query('SELECT password FROM users WHERE id = ? LIMIT 1', [this.id]);
      passwordToPersist = rows[0]?.password;
    }

    const passwordLooksHashed = typeof passwordToPersist === 'string' && /^\$2[aby]\$\d{2}\$/.test(passwordToPersist);
    if (passwordToPersist && (!passwordLooksHashed || this.__isNew || passwordToPersist !== this.__loadedPasswordHash)) {
      const salt = await bcrypt.genSalt(10);
      passwordToPersist = await bcrypt.hash(passwordToPersist, salt);
    }

    const payload = {
      username: this.username || null,
      fullName: this.fullName || null,
      email: this.email || null,
      phoneNumber: this.phoneNumber || null,
      password: passwordToPersist || null,
      role: this.role || 'Tenant',
      isVerified: this.isVerified ? 1 : 0,
      verificationStatus: this.verificationStatus || 'Pending',
      verificationType: this.verificationType || 'Student ID',
      verificationDocumentUrl: this.verificationDocumentUrl || null,
      verificationToken: this.verificationToken || null,
      verificationTokenExpires: this.verificationTokenExpires || null,
      passwordResetToken: this.passwordResetToken || null,
      passwordResetExpires: this.passwordResetExpires || null,
      passwordResetOtp: this.passwordResetOtp || null,
      passwordResetOtpExpires: this.passwordResetOtpExpires || null,
      passwordResetOtpRequestedAt: this.passwordResetOtpRequestedAt || null,
      passwordResetOtpRequestCount: Number(this.passwordResetOtpRequestCount || 0),
      passwordResetOtpWindowStartedAt: this.passwordResetOtpWindowStartedAt || null,
      profileSummary: this.profileSummary || null,
      instituteType: this.instituteType || null,
      instituteName: this.instituteName || null,
      hometown: this.hometown || null,
      profilePictureUrl: this.profilePictureUrl || null,
      verificationFeedback: this.verificationFeedback || null,
      verificationReviewedAt: this.verificationReviewedAt || null,
    };

    try {
      if (this.__isNew) {
        const [result] = await pool.query(
          `INSERT INTO users (
            username, fullName, email, phoneNumber, password, role,
            isVerified, verificationStatus, verificationType, verificationDocumentUrl,
            verificationToken, verificationTokenExpires,
            passwordResetToken, passwordResetExpires,
            passwordResetOtp, passwordResetOtpExpires,
            passwordResetOtpRequestedAt, passwordResetOtpRequestCount, passwordResetOtpWindowStartedAt,
            profileSummary, instituteType, instituteName, hometown,
            profilePictureUrl, verificationFeedback, verificationReviewedAt
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?
          )`,
          [
            payload.username,
            payload.fullName,
            payload.email,
            payload.phoneNumber,
            payload.password,
            payload.role,
            payload.isVerified,
            payload.verificationStatus,
            payload.verificationType,
            payload.verificationDocumentUrl,
            payload.verificationToken,
            payload.verificationTokenExpires,
            payload.passwordResetToken,
            payload.passwordResetExpires,
            payload.passwordResetOtp,
            payload.passwordResetOtpExpires,
            payload.passwordResetOtpRequestedAt,
            payload.passwordResetOtpRequestCount,
            payload.passwordResetOtpWindowStartedAt,
            payload.profileSummary,
            payload.instituteType,
            payload.instituteName,
            payload.hometown,
            payload.profilePictureUrl,
            payload.verificationFeedback,
            payload.verificationReviewedAt,
          ]
        );
        this.id = result.insertId;
        this._id = String(result.insertId);
        this.__isNew = false;
      } else {
        await pool.query(
          `UPDATE users SET
            username = ?,
            fullName = ?,
            email = ?,
            phoneNumber = ?,
            password = ?,
            role = ?,
            isVerified = ?,
            verificationStatus = ?,
            verificationType = ?,
            verificationDocumentUrl = ?,
            verificationToken = ?,
            verificationTokenExpires = ?,
            passwordResetToken = ?,
            passwordResetExpires = ?,
            passwordResetOtp = ?,
            passwordResetOtpExpires = ?,
            passwordResetOtpRequestedAt = ?,
            passwordResetOtpRequestCount = ?,
            passwordResetOtpWindowStartedAt = ?,
            profileSummary = ?,
            instituteType = ?,
            instituteName = ?,
            hometown = ?,
            profilePictureUrl = ?,
            verificationFeedback = ?,
            verificationReviewedAt = ?
           WHERE id = ?`,
          [
            payload.username,
            payload.fullName,
            payload.email,
            payload.phoneNumber,
            payload.password,
            payload.role,
            payload.isVerified,
            payload.verificationStatus,
            payload.verificationType,
            payload.verificationDocumentUrl,
            payload.verificationToken,
            payload.verificationTokenExpires,
            payload.passwordResetToken,
            payload.passwordResetExpires,
            payload.passwordResetOtp,
            payload.passwordResetOtpExpires,
            payload.passwordResetOtpRequestedAt,
            payload.passwordResetOtpRequestCount,
            payload.passwordResetOtpWindowStartedAt,
            payload.profileSummary,
            payload.instituteType,
            payload.instituteName,
            payload.hometown,
            payload.profilePictureUrl,
            payload.verificationFeedback,
            payload.verificationReviewedAt,
            this.id,
          ]
        );
      }
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
        const normalized = new Error('Duplicate value violates a unique constraint.');
        normalized.code = error.code;
        throw normalized;
      }
      throw error;
    }

    this.password = payload.password;
    this.__loadedPasswordHash = payload.password;
    return this;
  }
}

module.exports = User;
