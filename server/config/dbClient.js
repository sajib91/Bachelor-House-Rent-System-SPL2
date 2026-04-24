const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
const shouldUseSsl = String(process.env.PG_SSL || '').toLowerCase() === 'true';
let activeConnectionString = connectionString;

const createPool = (value) => new Pool({
  connectionString: value,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
});

let pool = createPool(activeConnectionString);

const quote = (field) => `"${field}"`;

const applySelect = (row, select) => {
  if (!row || !select) return row;
  const result = {};

  Object.entries(select).forEach(([key, value]) => {
    if (value === true) {
      result[key] = row[key];
      return;
    }

    if (value && typeof value === 'object' && row[key] !== undefined) {
      if (Array.isArray(row[key])) {
        result[key] = row[key].map((item) => applySelect(item, value.select || value));
      } else {
        result[key] = applySelect(row[key], value.select || value);
      }
    }
  });

  return result;
};

const applySelectMany = (rows, select) => {
  if (!select) return rows;
  return rows.map((row) => applySelect(row, select));
};

const buildSimpleWhere = (where = {}, alias = '') => {
  const params = [];
  const prefix = alias ? `${alias}.` : '';

  const nextParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const parse = (obj) => {
    const clauses = [];
    Object.entries(obj || {}).forEach(([key, value]) => {
      if (key === 'OR' && Array.isArray(value)) {
        const orClauses = value
          .map((entry) => parse(entry))
          .filter((sql) => sql && sql.trim().length > 0)
          .map((sql) => `(${sql})`);
        if (orClauses.length > 0) {
          clauses.push(orClauses.join(' OR '));
        }
        return;
      }

      const field = `${prefix}${quote(key)}`;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (Object.prototype.hasOwnProperty.call(value, 'contains')) {
          const param = nextParam(`%${value.contains}%`);
          if (String(value.mode || '').toLowerCase() === 'insensitive') {
            clauses.push(`LOWER(${field}::text) LIKE LOWER(${param}::text)`);
          } else {
            clauses.push(`${field}::text LIKE ${param}::text`);
          }
          return;
        }

        if (Object.prototype.hasOwnProperty.call(value, 'equals')) {
          const param = nextParam(value.equals);
          if (String(value.mode || '').toLowerCase() === 'insensitive') {
            clauses.push(`LOWER(${field}::text) = LOWER(${param}::text)`);
          } else {
            clauses.push(`${field} = ${param}`);
          }
          return;
        }

        if (Object.prototype.hasOwnProperty.call(value, 'in') && Array.isArray(value.in)) {
          const param = nextParam(value.in);
          clauses.push(`${field} = ANY(${param})`);
          return;
        }

        if (Object.prototype.hasOwnProperty.call(value, 'notIn') && Array.isArray(value.notIn)) {
          const param = nextParam(value.notIn);
          clauses.push(`NOT (${field} = ANY(${param}))`);
          return;
        }

        if (Object.prototype.hasOwnProperty.call(value, 'not')) {
          const param = nextParam(value.not);
          clauses.push(`${field} <> ${param}`);
          return;
        }

        if (Object.prototype.hasOwnProperty.call(value, 'gte')) {
          const param = nextParam(value.gte);
          clauses.push(`${field} >= ${param}`);
        }
        if (Object.prototype.hasOwnProperty.call(value, 'lte')) {
          const param = nextParam(value.lte);
          clauses.push(`${field} <= ${param}`);
        }
        if (Object.prototype.hasOwnProperty.call(value, 'gt')) {
          const param = nextParam(value.gt);
          clauses.push(`${field} > ${param}`);
        }
        if (Object.prototype.hasOwnProperty.call(value, 'lt')) {
          const param = nextParam(value.lt);
          clauses.push(`${field} < ${param}`);
        }
        return;
      }

      const param = nextParam(value);
      clauses.push(`${field} = ${param}`);
    });

    return clauses.join(' AND ');
  };

  return {
    sql: parse(where),
    params,
  };
};

const buildOrderBy = (orderBy) => {
  if (!orderBy) return '';

  const entries = Array.isArray(orderBy)
    ? orderBy.flatMap((item) => Object.entries(item || {}))
    : Object.entries(orderBy || {});

  if (entries.length === 0) return '';

  const parts = entries.map(([field, dir]) => `${quote(field)} ${String(dir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`);
  return ` ORDER BY ${parts.join(', ')}`;
};

const buildInsert = (tableName, data) => {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const columns = entries.map(([key]) => quote(key));
  const placeholders = entries.map((_, index) => `$${index + 1}`);
  const params = entries.map(([, value]) => value);

  return {
    sql: `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    params,
  };
};

const buildUpdate = (tableName, where, data) => {
  const setClauses = [];
  const params = [];

  Object.entries(data || {}).forEach(([key, value]) => {
    if (value === undefined) return;

    if (value && typeof value === 'object' && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, 'increment')) {
      params.push(value.increment);
      setClauses.push(`${quote(key)} = COALESCE(${quote(key)}, 0) + $${params.length}`);
      return;
    }

    params.push(value);
    setClauses.push(`${quote(key)} = $${params.length}`);
  });

  if (!Object.prototype.hasOwnProperty.call(data || {}, 'updatedAt')) {
    params.push(new Date());
    setClauses.push(`${quote('updatedAt')} = $${params.length}`);
  }

  const whereEntries = Object.entries(where || {});
  const whereClauses = whereEntries.map(([key, value]) => {
    params.push(value);
    return `${quote(key)} = $${params.length}`;
  });

  return {
    sql: `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')} RETURNING *`,
    params,
  };
};

const pickFirst = (rows) => (Array.isArray(rows) && rows.length > 0 ? rows[0] : null);

const queryRows = async (executor, sql, params = []) => {
  const result = await executor.query(sql, params);
  return result.rows;
};

const attachPropertyIncludes = async (executor, properties, include = {}) => {
  if (!include || properties.length === 0) return properties;

  const propertyIds = properties.map((item) => item.id);

  if (include.landlord) {
    const landlordIds = [...new Set(properties.map((item) => item.landlordId).filter(Boolean))];
    if (landlordIds.length > 0) {
      const landlords = await queryRows(executor, `SELECT * FROM "User" WHERE "id" = ANY($1)`, [landlordIds]);
      const byId = new Map(landlords.map((row) => [row.id, row]));
      properties.forEach((property) => {
        const landlord = byId.get(property.landlordId) || null;
        property.landlord = include.landlord.select ? applySelect(landlord, include.landlord.select) : landlord;
      });
    }
  }

  if (include.seatApplications) {
    let seatApplications = await queryRows(executor, `SELECT * FROM "SeatApplication" WHERE "propertyId" = ANY($1) ORDER BY "createdAt" DESC`, [propertyIds]);
    const where = include.seatApplications.where || {};
    seatApplications = seatApplications.filter((row) => {
      return Object.entries(where).every(([key, value]) => row[key] === value);
    });

    if (include.seatApplications.include && include.seatApplications.include.tenant) {
      const tenantIds = [...new Set(seatApplications.map((item) => item.tenantId).filter(Boolean))];
      const tenants = tenantIds.length > 0
        ? await queryRows(executor, `SELECT * FROM "User" WHERE "id" = ANY($1)`, [tenantIds])
        : [];
      const byId = new Map(tenants.map((row) => [row.id, row]));
      seatApplications = seatApplications.map((item) => ({
        ...item,
        tenant: applySelect(byId.get(item.tenantId) || null, include.seatApplications.include.tenant.select),
      }));
    }

    const grouped = new Map();
    seatApplications.forEach((item) => {
      const group = grouped.get(item.propertyId) || [];
      group.push(item);
      grouped.set(item.propertyId, group);
    });

    properties.forEach((property) => {
      property.seatApplications = grouped.get(property.id) || [];
    });
  }

  if (include.rentPayments) {
    let rentPayments = await queryRows(executor, `SELECT * FROM "RentPayment" WHERE "propertyId" = ANY($1) ORDER BY "createdAt" DESC`, [propertyIds]);
    const where = include.rentPayments.where || {};
    rentPayments = rentPayments.filter((row) => {
      return Object.entries(where).every(([key, value]) => row[key] === value);
    });

    if (include.rentPayments.include && include.rentPayments.include.tenant) {
      const tenantIds = [...new Set(rentPayments.map((item) => item.tenantId).filter(Boolean))];
      const tenants = tenantIds.length > 0
        ? await queryRows(executor, `SELECT * FROM "User" WHERE "id" = ANY($1)`, [tenantIds])
        : [];
      const byId = new Map(tenants.map((row) => [row.id, row]));
      rentPayments = rentPayments.map((item) => ({
        ...item,
        tenant: applySelect(byId.get(item.tenantId) || null, include.rentPayments.include.tenant.select),
      }));
    }

    const grouped = new Map();
    rentPayments.forEach((item) => {
      const group = grouped.get(item.propertyId) || [];
      group.push(item);
      grouped.set(item.propertyId, group);
    });

    properties.forEach((property) => {
      property.rentPayments = grouped.get(property.id) || [];
    });
  }

  if (include.messages) {
    let messages = await queryRows(executor, `SELECT * FROM "ChatMessage" WHERE "propertyId" = ANY($1) ORDER BY "createdAt" DESC`, [propertyIds]);

    if (include.messages.include && include.messages.include.sender) {
      const senderIds = [...new Set(messages.map((item) => item.senderId).filter(Boolean))];
      const senders = senderIds.length > 0
        ? await queryRows(executor, `SELECT * FROM "User" WHERE "id" = ANY($1)`, [senderIds])
        : [];
      const byId = new Map(senders.map((row) => [row.id, row]));
      messages = messages.map((item) => ({
        ...item,
        sender: applySelect(byId.get(item.senderId) || null, include.messages.include.sender.select),
      }));
    }

    const grouped = new Map();
    messages.forEach((item) => {
      const group = grouped.get(item.propertyId) || [];
      group.push(item);
      grouped.set(item.propertyId, group);
    });

    properties.forEach((property) => {
      property.messages = grouped.get(property.id) || [];
    });
  }

  if (include.reviews) {
    let reviews = await queryRows(executor, `SELECT * FROM "Review" WHERE "propertyId" = ANY($1) ORDER BY "createdAt" DESC`, [propertyIds]);

    if (include.reviews.include && include.reviews.include.tenant) {
      const tenantIds = [...new Set(reviews.map((item) => item.tenantId).filter(Boolean))];
      const tenants = tenantIds.length > 0
        ? await queryRows(executor, `SELECT * FROM "User" WHERE "id" = ANY($1)`, [tenantIds])
        : [];
      const byId = new Map(tenants.map((row) => [row.id, row]));
      reviews = reviews.map((item) => ({
        ...item,
        tenant: applySelect(byId.get(item.tenantId) || null, include.reviews.include.tenant.select),
      }));
    }

    const grouped = new Map();
    reviews.forEach((item) => {
      const group = grouped.get(item.propertyId) || [];
      group.push(item);
      grouped.set(item.propertyId, group);
    });

    properties.forEach((property) => {
      property.reviews = grouped.get(property.id) || [];
    });
  }

  return properties;
};

const attachRentPaymentIncludes = async (executor, payments, include = {}) => {
  if (!include || payments.length === 0) return payments;

  if (include.tenant) {
    const tenantIds = [...new Set(payments.map((item) => item.tenantId).filter(Boolean))];
    const tenants = tenantIds.length > 0
      ? await queryRows(executor, `SELECT * FROM "User" WHERE "id" = ANY($1)`, [tenantIds])
      : [];
    const byId = new Map(tenants.map((row) => [row.id, row]));

    payments.forEach((payment) => {
      const tenant = byId.get(payment.tenantId) || null;
      payment.tenant = include.tenant.select ? applySelect(tenant, include.tenant.select) : tenant;
    });
  }

  if (include.property) {
    const propertyIds = [...new Set(payments.map((item) => item.propertyId).filter(Boolean))];
    let properties = propertyIds.length > 0
      ? await queryRows(executor, `SELECT * FROM "Property" WHERE "id" = ANY($1)`, [propertyIds])
      : [];

    if (include.property.include && include.property.include.landlord) {
      properties = await attachPropertyIncludes(executor, properties, { landlord: include.property.include.landlord });
    }

    const byId = new Map(properties.map((row) => [row.id, row]));
    payments.forEach((payment) => {
      payment.property = byId.get(payment.propertyId) || null;
    });
  }

  return payments;
};

const createDbClient = (executor) => {
  const user = {
    findUnique: async ({ where = {}, select } = {}) => {
      const [key, value] = Object.entries(where)[0] || [];
      if (!key) return null;
      const rows = await queryRows(executor, `SELECT * FROM "User" WHERE ${quote(key)} = $1 LIMIT 1`, [value]);
      return applySelect(pickFirst(rows), select);
    },

    findFirst: async ({ where = {}, select } = {}) => {
      const { sql, params } = buildSimpleWhere(where);
      const query = `SELECT * FROM "User"${sql ? ` WHERE ${sql}` : ''} LIMIT 1`;
      const rows = await queryRows(executor, query, params);
      return applySelect(pickFirst(rows), select);
    },

    findMany: async ({ where = {}, orderBy, select } = {}) => {
      const { sql, params } = buildSimpleWhere(where);
      const query = `SELECT * FROM "User"${sql ? ` WHERE ${sql}` : ''}${buildOrderBy(orderBy)}`;
      const rows = await queryRows(executor, query, params);
      return applySelectMany(rows, select);
    },

    create: async ({ data = {}, select } = {}) => {
      const { sql, params } = buildInsert('"User"', data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(pickFirst(rows), select);
    },

    update: async ({ where = {}, data = {}, select } = {}) => {
      const { sql, params } = buildUpdate('"User"', where, data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(pickFirst(rows), select);
    },
  };

  const blog = {
    create: async ({ data = {}, select } = {}) => {
      const { sql, params } = buildInsert('"Blog"', data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(pickFirst(rows), select);
    },

    findMany: async ({ orderBy, skip, take, where = {}, select } = {}) => {
      const { sql, params } = buildSimpleWhere(where);
      const sqlParts = [`SELECT * FROM "Blog"`];
      if (sql) sqlParts.push(`WHERE ${sql}`);
      sqlParts.push(buildOrderBy(orderBy));
      if (skip !== undefined) {
        params.push(Number(skip));
        sqlParts.push(`OFFSET $${params.length}`);
      }
      if (take !== undefined) {
        params.push(Number(take));
        sqlParts.push(`LIMIT $${params.length}`);
      }

      const rows = await queryRows(executor, sqlParts.filter(Boolean).join(' '), params);
      return applySelectMany(rows, select);
    },

    count: async ({ where = {} } = {}) => {
      const { sql, params } = buildSimpleWhere(where);
      const rows = await queryRows(executor, `SELECT COUNT(*)::int AS count FROM "Blog"${sql ? ` WHERE ${sql}` : ''}`, params);
      return rows[0]?.count || 0;
    },

    findUnique: async ({ where = {}, select } = {}) => {
      const [key, value] = Object.entries(where)[0] || [];
      if (!key) return null;
      const rows = await queryRows(executor, `SELECT * FROM "Blog" WHERE ${quote(key)} = $1 LIMIT 1`, [value]);
      return applySelect(pickFirst(rows), select);
    },

    update: async ({ where = {}, data = {}, select } = {}) => {
      const { sql, params } = buildUpdate('"Blog"', where, data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(pickFirst(rows), select);
    },
  };

  const contact = {
    create: async ({ data = {}, select } = {}) => {
      const { sql, params } = buildInsert('"Contact"', data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(pickFirst(rows), select);
    },

    findMany: async ({ where = {}, orderBy, select } = {}) => {
      const { sql, params } = buildSimpleWhere(where);
      const rows = await queryRows(executor, `SELECT * FROM "Contact"${sql ? ` WHERE ${sql}` : ''}${buildOrderBy(orderBy)}`, params);
      return applySelectMany(rows, select);
    },

    findUnique: async ({ where = {}, select } = {}) => {
      const [key, value] = Object.entries(where)[0] || [];
      if (!key) return null;
      const rows = await queryRows(executor, `SELECT * FROM "Contact" WHERE ${quote(key)} = $1 LIMIT 1`, [value]);
      return applySelect(pickFirst(rows), select);
    },

    update: async ({ where = {}, data = {}, select } = {}) => {
      const { sql, params } = buildUpdate('"Contact"', where, data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(pickFirst(rows), select);
    },
  };

  const property = {
    findUnique: async ({ where = {}, include, select } = {}) => {
      const [key, value] = Object.entries(where)[0] || [];
      if (!key) return null;
      let rows = await queryRows(executor, `SELECT * FROM "Property" WHERE ${quote(key)} = $1 LIMIT 1`, [value]);
      if (rows.length === 0) return null;
      rows = await attachPropertyIncludes(executor, rows, include);
      const row = rows[0];
      return select ? applySelect(row, select) : row;
    },

    findMany: async ({ where = {}, include, orderBy, select } = {}) => {
      const seatSome = where.seatApplications?.some;
      const whereWithoutSeat = { ...where };
      delete whereWithoutSeat.seatApplications;

      const { sql, params } = buildSimpleWhere(whereWithoutSeat, 'p');
      const conditions = [];
      if (sql) conditions.push(sql);

      if (seatSome) {
        const { sql: someSql, params: someParams } = buildSimpleWhere(seatSome, 'sa');
        someParams.forEach((value) => params.push(value));
        const shiftedSql = someSql.replace(/\$(\d+)/g, (_, num) => `$${Number(num) + (params.length - someParams.length)}`);
        conditions.push(`EXISTS (SELECT 1 FROM "SeatApplication" sa WHERE sa."propertyId" = p."id" AND ${shiftedSql})`);
      }

      const query = `SELECT * FROM "Property" p${conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''}${buildOrderBy(orderBy)}`;
      let rows = await queryRows(executor, query, params);
      rows = await attachPropertyIncludes(executor, rows, include);
      return applySelectMany(rows, select);
    },

    create: async ({ data = {}, include, select } = {}) => {
      const { sql, params } = buildInsert('"Property"', data);
      let rows = await queryRows(executor, sql, params);
      rows = await attachPropertyIncludes(executor, rows, include);
      return applySelect(rows[0], select);
    },

    update: async ({ where = {}, data = {}, include, select } = {}) => {
      const { sql, params } = buildUpdate('"Property"', where, data);
      let rows = await queryRows(executor, sql, params);
      rows = await attachPropertyIncludes(executor, rows, include);
      return applySelect(rows[0], select);
    },
  };

  const seatApplication = {
    create: async ({ data = {}, select } = {}) => {
      const { sql, params } = buildInsert('"SeatApplication"', data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(rows[0], select);
    },

    findFirst: async ({ where = {}, select } = {}) => {
      const { sql, params } = buildSimpleWhere(where);
      const rows = await queryRows(executor, `SELECT * FROM "SeatApplication"${sql ? ` WHERE ${sql}` : ''} LIMIT 1`, params);
      return applySelect(rows[0] || null, select);
    },

    update: async ({ where = {}, data = {}, select } = {}) => {
      const { sql, params } = buildUpdate('"SeatApplication"', where, data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(rows[0] || null, select);
    },
  };

  const rentPayment = {
    create: async ({ data = {}, select } = {}) => {
      const { sql, params } = buildInsert('"RentPayment"', data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(rows[0], select);
    },

    findFirst: async ({ where = {}, include, select } = {}) => {
      const { sql, params } = buildSimpleWhere(where);
      let rows = await queryRows(executor, `SELECT * FROM "RentPayment"${sql ? ` WHERE ${sql}` : ''} LIMIT 1`, params);
      rows = await attachRentPaymentIncludes(executor, rows, include);
      const row = rows[0] || null;
      return select ? applySelect(row, select) : row;
    },

    findUnique: async ({ where = {}, include, select } = {}) => {
      const [key, value] = Object.entries(where)[0] || [];
      if (!key) return null;
      let rows = await queryRows(executor, `SELECT * FROM "RentPayment" WHERE ${quote(key)} = $1 LIMIT 1`, [value]);
      rows = await attachRentPaymentIncludes(executor, rows, include);
      const row = rows[0] || null;
      return select ? applySelect(row, select) : row;
    },

    update: async ({ where = {}, data = {}, select } = {}) => {
      const { sql, params } = buildUpdate('"RentPayment"', where, data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(rows[0], select);
    },
  };

  const chatMessage = {
    create: async ({ data = {}, select } = {}) => {
      const { sql, params } = buildInsert('"ChatMessage"', data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(rows[0], select);
    },
  };

  const review = {
    create: async ({ data = {}, select } = {}) => {
      const { sql, params } = buildInsert('"Review"', data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(rows[0], select);
    },

    findFirst: async ({ where = {}, select } = {}) => {
      const { sql, params } = buildSimpleWhere(where);
      const rows = await queryRows(executor, `SELECT * FROM "Review"${sql ? ` WHERE ${sql}` : ''} LIMIT 1`, params);
      return applySelect(rows[0] || null, select);
    },

    findMany: async ({ where = {}, orderBy, select } = {}) => {
      const { sql, params } = buildSimpleWhere(where);
      const rows = await queryRows(executor, `SELECT * FROM "Review"${sql ? ` WHERE ${sql}` : ''}${buildOrderBy(orderBy)}`, params);
      return applySelectMany(rows, select);
    },

    update: async ({ where = {}, data = {}, select } = {}) => {
      const { sql, params } = buildUpdate('"Review"', where, data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(rows[0], select);
    },
  };

  const intelligenceSettings = {
    findUnique: async ({ where = {}, select } = {}) => {
      const [key, value] = Object.entries(where)[0] || [];
      if (!key) return null;
      const rows = await queryRows(executor, `SELECT * FROM "IntelligenceSettings" WHERE ${quote(key)} = $1 LIMIT 1`, [value]);
      return applySelect(rows[0] || null, select);
    },

    upsert: async ({ where = {}, create = {}, update = {}, select } = {}) => {
      const [key, value] = Object.entries(where)[0] || [];
      if (!key) return null;
      const existingRows = await queryRows(executor, `SELECT * FROM "IntelligenceSettings" WHERE ${quote(key)} = $1 LIMIT 1`, [value]);
      if (existingRows.length > 0) {
        const updated = await intelligenceSettings.update({ where: { id: existingRows[0].id }, data: update, select });
        return updated;
      }
      const created = await intelligenceSettings.create({ data: create, select });
      return created;
    },

    create: async ({ data = {}, select } = {}) => {
      const { sql, params } = buildInsert('"IntelligenceSettings"', data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(rows[0], select);
    },

    update: async ({ where = {}, data = {}, select } = {}) => {
      const { sql, params } = buildUpdate('"IntelligenceSettings"', where, data);
      const rows = await queryRows(executor, sql, params);
      return applySelect(rows[0], select);
    },
  };

  return {
    user,
    blog,
    contact,
    property,
    seatApplication,
    rentPayment,
    chatMessage,
    review,
    intelligenceSettings,

    $connect: async () => {
      await executor.query('SELECT 1');
    },

    $transaction: async (callback) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const tx = createDbClient(client);
        const result = await callback(tx);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
};

let dbClient;

const setDbConnectionString = (nextConnectionString) => {
  if (!nextConnectionString || nextConnectionString === activeConnectionString) {
    return pool;
  }

  activeConnectionString = nextConnectionString;
  pool = createPool(activeConnectionString);
  dbClient = null;
  return pool;
};

const getDbConnectionString = () => activeConnectionString;

const getDbClient = () => {
  if (!dbClient) {
    dbClient = createDbClient(pool);
  }
  return dbClient;
};

module.exports = getDbClient;
module.exports.setDbConnectionString = setDbConnectionString;
module.exports.getDbConnectionString = getDbConnectionString;
