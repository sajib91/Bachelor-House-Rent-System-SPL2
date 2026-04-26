const crypto = require('crypto');
const { getPool } = require('../config/sqlPool');

const toJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const serializeJson = (value) => JSON.stringify(Array.isArray(value) ? value : []);

const normalizeSqlTime = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    return raw.length === 5 ? `${raw}:00` : raw;
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'AM' && hour === 12) hour = 0;
  if (meridiem === 'PM' && hour !== 12) hour += 12;

  return `${String(hour).padStart(2, '0')}:${minute}:00`;
};

const ensureId = (item) => {
  if (!item._id) {
    item._id = crypto.randomBytes(12).toString('hex');
  }
  return item;
};

const attachIdAccessor = (arr = []) => {
  arr.forEach((item) => ensureId(item));
  arr.id = (id) => arr.find((item) => String(item._id) === String(id));
  return arr;
};

const matchesRegexCondition = (value, condition) => {
  const pattern = condition?.$regex;
  if (!pattern) return true;
  const flags = condition?.$options || '';
  const regex = new RegExp(pattern, flags);
  return regex.test(String(value || ''));
};

const matchesQuery = (property, query = {}) => {
  return Object.entries(query).every(([key, condition]) => {
    if (key === 'seatApplications' && condition?.$elemMatch) {
      return (property.seatApplications || []).some((application) =>
        Object.entries(condition.$elemMatch).every(([subKey, subValue]) => String(application[subKey]) === String(subValue))
      );
    }

    const value = property[key];

    if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
      if ('$regex' in condition) return matchesRegexCondition(value, condition);
      if ('$gte' in condition || '$lte' in condition) {
        const num = Number(value || 0);
        if (condition.$gte !== undefined && num < Number(condition.$gte)) return false;
        if (condition.$lte !== undefined && num > Number(condition.$lte)) return false;
        return true;
      }
      if ('$all' in condition) {
        const available = new Set((value || []).map((item) => String(item)));
        return condition.$all.every((entry) => available.has(String(entry)));
      }
      return true;
    }

    return String(value) === String(condition);
  });
};

const hydrate = (row) => {
  if (!row) return null;

  const property = new Property({
    id: row.id,
    landlord: row.landlordId,
    landlordName: row.landlordName,
    landlordPhone: row.landlordPhone,
    landlordWhatsapp: row.landlordWhatsapp,
    landlordBkash: row.landlordBkash,
    landlordNagad: row.landlordNagad,
    title: row.title,
    area: row.area,
    nearbyUniversity: row.nearbyUniversity,
    address: row.address,
    mapLocation: {
      latitude: row.mapLatitude,
      longitude: row.mapLongitude,
      label: row.mapLabel,
      link: row.mapLink,
    },
    totalSeats: row.totalSeats,
    availableSeats: row.availableSeats,
    genderPreference: row.genderPreference,
    roomType: row.roomType,
    monthlyRentPerSeat: row.monthlyRentPerSeat,
    securityDeposit: row.securityDeposit,
    mealSystem: row.mealSystem,
    amenities: toJsonArray(row.amenities),
    rules: {
      gateClosingTime: row.gateClosingTime,
      guestPolicy: row.guestPolicy,
      smokingRules: row.smokingRules,
      attachedBath: Boolean(row.attachedBath),
      filteredWater: Boolean(row.filteredWater),
      lift: Boolean(row.lift),
      wifi: Boolean(row.wifi),
    },
    photos: toJsonArray(row.photos),
    description: row.description,
    universityProximity: row.universityProximity,
    commuteMinutes: row.commuteMinutes,
    rentalMonth: row.rentalMonth,
    isActive: Boolean(row.isActive),
    publicationStatus: row.publicationStatus,
    views: Number(row.views || 0),
    seatApplications: attachIdAccessor(toJsonArray(row.seatApplications)),
    rentPayments: attachIdAccessor(toJsonArray(row.rentPayments)),
    messages: attachIdAccessor(toJsonArray(row.messages)),
    reviews: attachIdAccessor(toJsonArray(row.reviews)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  property._id = String(row.id);
  property.__isNew = false;
  return property;
};

class PropertyQuery {
  constructor(query = {}) {
    this.query = query;
    this.sortConfig = null;
    this.skipCount = 0;
    this.limitCount = null;
  }

  populate() {
    return this;
  }

  select() {
    return this;
  }

  sort(sortConfig = {}) {
    this.sortConfig = sortConfig;
    return this;
  }

  skip(skipCount = 0) {
    this.skipCount = Number(skipCount || 0);
    return this;
  }

  limit(limitCount = null) {
    this.limitCount = limitCount === null ? null : Number(limitCount);
    return this;
  }

  async exec() {
    const [rows] = await getPool().query('SELECT * FROM properties');
    let result = rows.map(hydrate).filter((item) => matchesQuery(item, this.query));

    if (this.sortConfig && Object.keys(this.sortConfig).length > 0) {
      const [sortKey, sortOrder] = Object.entries(this.sortConfig)[0];
      result = result.sort((left, right) => {
        const lv = left[sortKey] ?? 0;
        const rv = right[sortKey] ?? 0;
        if (lv === rv) return 0;
        return lv > rv ? Number(sortOrder) : -Number(sortOrder);
      });
    }

    if (this.skipCount > 0) result = result.slice(this.skipCount);
    if (Number.isFinite(this.limitCount) && this.limitCount >= 0) result = result.slice(0, this.limitCount);

    return result;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

class Property {
  constructor(data = {}) {
    Object.assign(this, {
      id: data.id,
      _id: data.id ? String(data.id) : undefined,
      landlord: data.landlord,
      landlordName: data.landlordName,
      landlordPhone: data.landlordPhone,
      landlordWhatsapp: data.landlordWhatsapp,
      landlordBkash: data.landlordBkash,
      landlordNagad: data.landlordNagad,
      title: data.title,
      area: data.area,
      nearbyUniversity: data.nearbyUniversity,
      address: data.address,
      mapLocation: data.mapLocation || {},
      totalSeats: Number(data.totalSeats || 0),
      availableSeats: Number(data.availableSeats || 0),
      genderPreference: data.genderPreference,
      roomType: data.roomType,
      monthlyRentPerSeat: Number(data.monthlyRentPerSeat || 0),
      securityDeposit: Number(data.securityDeposit || 0),
      mealSystem: data.mealSystem || 'Mixed',
      amenities: data.amenities || [],
      rules: data.rules || {},
      photos: data.photos || [],
      description: data.description,
      universityProximity: data.universityProximity,
      commuteMinutes: data.commuteMinutes,
      rentalMonth: data.rentalMonth,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      publicationStatus: data.publicationStatus || 'Pending',
      seatApplications: attachIdAccessor(data.seatApplications || []),
      rentPayments: attachIdAccessor(data.rentPayments || []),
      messages: attachIdAccessor(data.messages || []),
      reviews: attachIdAccessor(data.reviews || []),
      views: Number(data.views || 0),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });

    this.__isNew = !data.id;
  }

  static find(query = {}) {
    return new PropertyQuery(query);
  }

  static async countDocuments(query = {}) {
    const rows = await new PropertyQuery(query).exec();
    return rows.length;
  }

  static async create(data = {}) {
    const property = new Property(data);
    await property.save();
    return property;
  }

  static async findById(id) {
    const [rows] = await getPool().query('SELECT * FROM properties WHERE id = ? LIMIT 1', [id]);
    return hydrate(rows[0]);
  }

  static async deleteById(id) {
    await getPool().query('DELETE FROM properties WHERE id = ?', [id]);
  }

  toObject() {
    return {
      _id: this._id,
      id: this.id,
      landlord: this.landlord,
      landlordName: this.landlordName,
      landlordPhone: this.landlordPhone,
      landlordWhatsapp: this.landlordWhatsapp,
      landlordBkash: this.landlordBkash,
      landlordNagad: this.landlordNagad,
      title: this.title,
      area: this.area,
      nearbyUniversity: this.nearbyUniversity,
      address: this.address,
      mapLocation: this.mapLocation,
      totalSeats: this.totalSeats,
      availableSeats: this.availableSeats,
      genderPreference: this.genderPreference,
      roomType: this.roomType,
      monthlyRentPerSeat: this.monthlyRentPerSeat,
      securityDeposit: this.securityDeposit,
      mealSystem: this.mealSystem,
      amenities: this.amenities,
      rules: this.rules,
      photos: this.photos,
      description: this.description,
      universityProximity: this.universityProximity,
      commuteMinutes: this.commuteMinutes,
      rentalMonth: this.rentalMonth,
      isActive: this.isActive,
      publicationStatus: this.publicationStatus,
      seatApplications: this.seatApplications,
      rentPayments: this.rentPayments,
      messages: this.messages,
      reviews: this.reviews,
      views: this.views,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  async save() {
    this.seatApplications = attachIdAccessor(this.seatApplications || []);
    this.rentPayments = attachIdAccessor(this.rentPayments || []);
    this.messages = attachIdAccessor(this.messages || []);
    this.reviews = attachIdAccessor(this.reviews || []);

    const payload = [
      this.landlord,
      this.landlordName || null,
      this.landlordPhone || null,
      this.landlordWhatsapp || null,
      this.landlordBkash || null,
      this.landlordNagad || null,
      this.title,
      this.area || null,
      this.nearbyUniversity || null,
      this.address || null,
      this.mapLocation?.latitude || null,
      this.mapLocation?.longitude || null,
      this.mapLocation?.label || null,
      this.mapLocation?.link || null,
      Number(this.totalSeats || 0),
      Number(this.availableSeats || 0),
      this.genderPreference || null,
      this.roomType || null,
      Number(this.monthlyRentPerSeat || 0),
      Number(this.securityDeposit || 0),
      this.mealSystem || null,
      serializeJson(this.amenities),
      normalizeSqlTime(this.rules?.gateClosingTime),
      this.rules?.guestPolicy || null,
      this.rules?.smokingRules || null,
      this.rules?.attachedBath ? 1 : 0,
      this.rules?.filteredWater ? 1 : 0,
      this.rules?.lift ? 1 : 0,
      this.rules?.wifi ? 1 : 0,
      serializeJson(this.photos),
      this.description || null,
      this.universityProximity || null,
      this.commuteMinutes || null,
      this.rentalMonth || null,
      this.isActive ? 1 : 0,
      this.publicationStatus || 'Pending',
      Number(this.views || 0),
      serializeJson(this.seatApplications),
      serializeJson(this.rentPayments),
      serializeJson(this.messages),
      serializeJson(this.reviews),
    ];

    if (this.__isNew) {
      const [result] = await getPool().query(
        `INSERT INTO properties (
          landlordId, landlordName, landlordPhone, landlordWhatsapp, landlordBkash, landlordNagad,
          title, area, nearbyUniversity, address,
          mapLatitude, mapLongitude, mapLabel, mapLink,
          totalSeats, availableSeats, genderPreference, roomType,
          monthlyRentPerSeat, securityDeposit, mealSystem, amenities,
          gateClosingTime, guestPolicy, smokingRules, attachedBath, filteredWater, lift, wifi,
          photos, description, universityProximity, commuteMinutes, rentalMonth,
          isActive, publicationStatus, views,
          seatApplications, rentPayments, messages, reviews
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?
        )`,
        payload
      );
      this.id = result.insertId;
      this._id = String(result.insertId);
      this.__isNew = false;
    } else {
      await getPool().query(
        `UPDATE properties SET
          landlordId = ?, landlordName = ?, landlordPhone = ?, landlordWhatsapp = ?, landlordBkash = ?, landlordNagad = ?,
          title = ?, area = ?, nearbyUniversity = ?, address = ?,
          mapLatitude = ?, mapLongitude = ?, mapLabel = ?, mapLink = ?,
          totalSeats = ?, availableSeats = ?, genderPreference = ?, roomType = ?,
          monthlyRentPerSeat = ?, securityDeposit = ?, mealSystem = ?, amenities = ?,
          gateClosingTime = ?, guestPolicy = ?, smokingRules = ?, attachedBath = ?, filteredWater = ?, lift = ?, wifi = ?,
          photos = ?, description = ?, universityProximity = ?, commuteMinutes = ?, rentalMonth = ?,
          isActive = ?, publicationStatus = ?, views = ?,
          seatApplications = ?, rentPayments = ?, messages = ?, reviews = ?
         WHERE id = ?`,
        [...payload, this.id]
      );
    }

    return this;
  }
}

module.exports = Property;
