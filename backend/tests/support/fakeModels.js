/**
 * In-memory stand-ins for the Mongoose models, implementing only the
 * methods the controllers use (create/find/findOne/findById/deleteOne/save,
 * plus chainable select/sort/skip/limit). They let the HTTP-level tests run
 * with no MongoDB server. They do NOT test real Mongoose/MongoDB behaviour -
 * run the Newman collection against a real database for that.
 */
const crypto = require('crypto');

let seq = 0;

class Query {
  constructor(run) { this.run = run; this.opts = {}; }
  select() { return this; }
  sort(s) { this.opts.sort = s; return this; }
  skip(n) { this.opts.skip = n; return this; }
  limit(n) { this.opts.limit = n; return this; }
  then(resolve, reject) { return Promise.resolve().then(() => this.run(this.opts)).then(resolve, reject); }
  catch(reject) { return this.then(undefined, reject); }
}

const matches = (doc, filter) =>
  Object.entries(filter).every(([k, v]) => String(doc[k === '_id' ? 'id' : k]) === String(v));

function makeModel({ hidden = [], unique = [], defaults = {} } = {}) {
  let store = [];

  class Doc {
    constructor(data) {
      Object.assign(this, defaults, data);
      this.id = crypto.randomBytes(12).toString('hex');
      this.createdAt = new Date(Date.now() + seq++); // monotonic so newest-first sorting is stable
      this.updatedAt = this.createdAt;
    }
    save() { this.updatedAt = new Date(); return Promise.resolve(this); }
    toJSON() {
      const out = { ...this };
      hidden.forEach((h) => delete out[h]);
      return out;
    }
  }

  return {
    async create(data) {
      for (const field of unique) {
        if (store.some((d) => d[field] === data[field])) {
          const err = new Error('E11000 duplicate key');
          err.code = 11000;
          throw err;
        }
      }
      const doc = new Doc(data);
      store.push(doc);
      return doc;
    },
    find(filter = {}) {
      return new Query((o) => {
        let rows = store.filter((d) => matches(d, filter));
        if (o.sort) {
          const [[key, dir]] = Object.entries(o.sort);
          rows = [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir);
        }
        if (o.skip) rows = rows.slice(o.skip);
        if (o.limit) rows = rows.slice(0, o.limit);
        return rows;
      });
    },
    findOne: (filter) => new Query(() => store.find((d) => matches(d, filter)) || null),
    findById: (id) => new Query(() => store.find((d) => d.id === String(id)) || null),
    async deleteOne(filter) {
      const i = store.findIndex((d) => matches(d, filter));
      if (i >= 0) store.splice(i, 1);
      return { deletedCount: i >= 0 ? 1 : 0 };
    },
    __reset() { store = []; },
    __all() { return store; },
  };
}

module.exports = {
  User: makeModel({ hidden: ['passwordHash'], unique: ['email'], defaults: { role: 'client' } }),
  Gig: makeModel({ defaults: { status: 'active' } }),
  Booking: makeModel({ defaults: { status: 'confirmed', note: '' } }),
  Transaction: makeModel({ unique: ['reference'], defaults: { currency: 'ZAR', status: 'simulated-paid' } }),
};
