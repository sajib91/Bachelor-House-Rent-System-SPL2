const { getPool } = require('../config/sqlPool');

const hydrate = (row) => {
  if (!row) return null;
  const blog = new Blog({
    id: row.id,
    name: row.name,
    role: row.role,
    title: row.title,
    category: row.category,
    intro: row.intro,
    imageUrl: row.imageUrl,
    content: row.content,
    views: Number(row.views || 0),
    likes: Number(row.likes || 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  blog._id = String(row.id);
  blog.__isNew = false;
  return blog;
};

class BlogQuery {
  constructor(query = {}) {
    this.query = query;
    this.sortConfig = null;
    this.skipCount = 0;
    this.limitCount = null;
  }

  sort(config = {}) {
    this.sortConfig = config;
    return this;
  }

  skip(count = 0) {
    this.skipCount = Number(count || 0);
    return this;
  }

  limit(count = null) {
    this.limitCount = count === null ? null : Number(count);
    return this;
  }

  async exec() {
    const [rows] = await getPool().query('SELECT * FROM blogs');
    let results = rows
      .map(hydrate)
      .filter((blog) => {
        return Object.entries(this.query).every(([key, value]) => String(blog[key]) === String(value));
      });

    if (this.sortConfig && Object.keys(this.sortConfig).length) {
      const [key, order] = Object.entries(this.sortConfig)[0];
      results = results.sort((a, b) => {
        const left = a[key] ?? 0;
        const right = b[key] ?? 0;
        if (left === right) return 0;
        return left > right ? Number(order) : -Number(order);
      });
    }

    if (this.skipCount > 0) results = results.slice(this.skipCount);
    if (Number.isFinite(this.limitCount) && this.limitCount >= 0) results = results.slice(0, this.limitCount);

    return results;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

class Blog {
  constructor(data = {}) {
    this.id = data.id;
    this._id = data.id ? String(data.id) : undefined;
    this.name = data.name;
    this.role = data.role;
    this.title = data.title;
    this.category = data.category;
    this.intro = data.intro;
    this.imageUrl = data.imageUrl;
    this.content = data.content;
    this.views = Number(data.views || 0);
    this.likes = Number(data.likes || 0);
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.__isNew = !data.id;
  }

  static find(query = {}) {
    return new BlogQuery(query);
  }

  static async countDocuments(query = {}) {
    const rows = await new BlogQuery(query).exec();
    return rows.length;
  }

  static async findById(id) {
    const [rows] = await getPool().query('SELECT * FROM blogs WHERE id = ? LIMIT 1', [id]);
    return hydrate(rows[0]);
  }

  static async findByIdAndDelete(id) {
    const blog = await Blog.findById(id);
    if (!blog) return null;
    await getPool().query('DELETE FROM blogs WHERE id = ?', [id]);
    return blog;
  }

  async save() {
    if (this.__isNew) {
      const [result] = await getPool().query(
        `INSERT INTO blogs (name, role, title, category, intro, imageUrl, content, views, likes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [this.name, this.role, this.title, this.category, this.intro, this.imageUrl || null, this.content, this.views, this.likes]
      );
      this.id = result.insertId;
      this._id = String(result.insertId);
      this.__isNew = false;
      return this;
    }

    await getPool().query(
      `UPDATE blogs SET
       name = ?, role = ?, title = ?, category = ?, intro = ?, imageUrl = ?, content = ?, views = ?, likes = ?
       WHERE id = ?`,
      [this.name, this.role, this.title, this.category, this.intro, this.imageUrl || null, this.content, this.views, this.likes, this.id]
    );

    return this;
  }
}

module.exports = Blog;
