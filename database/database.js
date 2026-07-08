import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.resolve(__dirname);
const dbPath = process.env.DB_PATH || path.resolve(dbDir, 'bot.db');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS guilds (
    _id TEXT PRIMARY KEY,
    guildId TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    _id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    guildId TEXT NOT NULL,
    data TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE(userId, guildId)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    _id TEXT PRIMARY KEY,
    guildId TEXT NOT NULL,
    channelId TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS giveaways (
    _id TEXT PRIMARY KEY,
    guildId TEXT NOT NULL,
    messageId TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    _id TEXT PRIMARY KEY,
    guildId TEXT NOT NULL,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

const dateFields = ['createdAt', 'updatedAt', 'endTime', 'lastXp', 'joinedVoiceAt', 'closedAt'];

function reviveDates(data) {
  if (!data || typeof data !== 'object') return data;
  for (const key of Object.keys(data)) {
    if (dateFields.includes(key) && typeof data[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data[key])) {
      data[key] = new Date(data[key]);
    } else if (Array.isArray(data[key])) {
      data[key].forEach(item => reviveDates(item));
    } else if (data[key] && typeof data[key] === 'object') {
      reviveDates(data[key]);
    }
  }
  return data;
}

class Doc {
  constructor(data, table) {
    this._table = table;
    this._new = !data._id;
    for (const k of Object.keys(data)) {
      this[k] = data[k];
    }
  }

  async save() {
    const now = new Date().toISOString();
    const data = { updatedAt: now };
    for (const k of Object.keys(this)) {
      if (!k.startsWith('_')) data[k] = this[k] instanceof Date ? this[k].toISOString() : this[k];
    }
    if (!data.createdAt) data.createdAt = now;
    this.createdAt = data.createdAt;
    this.updatedAt = now;
    const json = JSON.stringify(data);
    const indexedCols = indexedColumns[this._table] || [];
    if (this._new) {
      this._id = this._id || crypto.randomUUID();
      data._id = this._id;
      const cols = ['_id', 'data', 'createdAt', 'updatedAt', ...indexedCols];
      const vals = [this._id, json, data.createdAt, now];
      for (const col of indexedCols) {
        vals.push(data[col] !== undefined ? data[col] : null);
      }
      const placeholders = cols.map(() => '?').join(', ');
      db.prepare(`INSERT INTO ${this._table} (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);
      this._new = false;
    } else {
      const setClauses = ['data = ?', 'updatedAt = ?'];
      const updateVals = [json, now];
      for (const col of indexedCols) {
        if (data[col] !== undefined) {
          setClauses.push(`${col} = ?`);
          updateVals.push(data[col]);
        }
      }
      updateVals.push(this._id);
      db.prepare(`UPDATE ${this._table} SET ${setClauses.join(', ')} WHERE _id = ?`).run(...updateVals);
    }
    return this;
  }

  toObject() {
    const o = {};
    for (const k of Object.keys(this)) {
      if (!k.startsWith('_')) o[k] = this[k];
    }
    return o;
  }
}

function rowToDoc(row, table) {
  if (!row) return null;
  const data = reviveDates(JSON.parse(row.data));
  const doc = new Doc({ _id: row._id, ...data }, table);
  doc._new = false;
  return doc;
}

const indexedColumns = {
  guilds: ['guildId'],
  users: ['userId', 'guildId'],
  tickets: ['guildId', 'channelId'],
  giveaways: ['guildId', 'messageId'],
  tournaments: ['guildId'],
};

function buildWhereClause(table, filter) {
  const cols = indexedColumns[table] || [];
  const where = [];
  const params = [];
  const remaining = { ...filter };
  for (const col of cols) {
    if (remaining[col] !== undefined) {
      where.push(`${col} = ?`);
      params.push(remaining[col]);
      delete remaining[col];
    }
  }
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params, remaining };
}

function allRows(table) {
  return db.prepare(`SELECT * FROM ${table}`).all();
}

function matchDoc(data, filter) {
  for (const [key, val] of Object.entries(filter)) {
    if (typeof val === 'object' && val !== null && '$ne' in val) {
      if (resolvePath(data, key) === val.$ne) return false;
    } else if (resolvePath(data, key) !== val) {
      return false;
    }
  }
  return true;
}

function resolvePath(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (p === '$' || p === '$[]') continue;
    cur = cur[p];
  }
  return cur;
}

function applyOperators(doc, update) {
  for (const [op, val] of Object.entries(update)) {
    if (op === '$inc') {
      for (const [k, v] of Object.entries(val)) {
        doc[k] = (doc[k] || 0) + v;
      }
    } else if (op === '$push') {
      for (const [rawKey, v] of Object.entries(val)) {
        const parts = rawKey.split('.');
        const dollarIdx = parts.indexOf('$');
        if (dollarIdx !== -1) {
          const arrKey = parts.slice(0, dollarIdx).join('.');
          const restKey = parts.slice(dollarIdx + 1).join('.');
          const arr = doc[arrKey];
          if (Array.isArray(arr)) {
            arr.forEach(item => {
              if (restKey) {
                if (!item[restKey]) item[restKey] = [];
                item[restKey].push(v);
              }
            });
          }
        } else if (parts.includes('$[]')) {
          const idx = parts.indexOf('$[]');
          const arrKey = parts.slice(0, idx).join('.');
          const restKey = parts.slice(idx + 1).join('.');
          const arr = doc[arrKey];
          if (Array.isArray(arr)) {
            arr.forEach(item => {
              if (restKey) {
                if (!item[restKey]) item[restKey] = [];
                item[restKey].push(v);
              }
            });
          }
        } else {
          if (!doc[rawKey]) doc[rawKey] = [];
          doc[rawKey].push(v);
        }
      }
    } else if (op === '$pull') {
      for (const [rawKey, condition] of Object.entries(val)) {
        const parts = rawKey.split('.');
        const idx = parts.indexOf('$[]');
        if (idx !== -1) {
          const arrKey = parts.slice(0, idx).join('.');
          const restKey = parts.slice(idx + 1).join('.');
          const arr = doc[arrKey];
          if (Array.isArray(arr)) {
            arr.forEach(item => {
              if (restKey && Array.isArray(item[restKey])) {
                item[restKey] = item[restKey].filter(el => {
                  for (const [ck, cv] of Object.entries(condition)) {
                    if (el[ck] === cv) return false;
                  }
                  return true;
                });
              }
            });
          }
        } else {
          const arr = doc[rawKey];
          if (Array.isArray(arr)) {
            doc[rawKey] = arr.filter(item => {
              for (const [ck, cv] of Object.entries(condition)) {
                if (typeof item === 'object' && item[ck] === cv) return false;
                if (item === cv) return false;
              }
              return true;
            });
          }
        }
      }
    } else if (!op.startsWith('$')) {
      doc[op] = val;
    }
  }
}

function createModel(table) {
  const deleteStmt = db.prepare(`DELETE FROM ${table} WHERE _id = ?`);

  const Model = function (data) {
    return new Doc(data, table);
  };

  const selectStmt = db.prepare(`SELECT * FROM ${table}`);

  Model.findOne = async (filter) => {
    const { where, params, remaining } = buildWhereClause(table, filter);
    if (Object.keys(remaining).length === 0 && where) {
      const row = db.prepare(`SELECT * FROM ${table} ${where} LIMIT 1`).get(...params);
      return row ? rowToDoc(row, table) : null;
    }
    const rows = selectStmt.all();
    for (const row of rows) {
      const data = reviveDates(JSON.parse(row.data));
      if (matchDoc(data, remaining)) {
        return rowToDoc(row, table);
      }
    }
    return null;
  };

  Model.find = async (filter = {}) => {
    const { where, params, remaining } = buildWhereClause(table, filter);
    if (Object.keys(remaining).length === 0 && where) {
      const rows = db.prepare(`SELECT * FROM ${table} ${where}`).all(...params);
      return rows.map(r => rowToDoc(r, table));
    }
    const rows = selectStmt.all();
    const results = [];
    for (const row of rows) {
      const data = reviveDates(JSON.parse(row.data));
      if (matchDoc(data, remaining)) {
        results.push(rowToDoc(row, table));
      }
    }
    return results;
  };

  Model.findOneAndUpdate = async (filter, update, options = {}) => {
    let doc = await Model.findOne(filter);
    if (!doc) {
      if (options.upsert) {
        const data = { ...filter };
        applyOperators(data, update);
        doc = new Doc(data, table);
        await doc.save();
        return options.returnDocument === 'after' ? doc : doc;
      }
      return null;
    }
    applyOperators(doc, update);
    await doc.save();
    return doc;
  };

  Model.deleteOne = async (filter) => {
    const doc = await Model.findOne(filter);
    if (doc) {
      deleteStmt.run(doc._id);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  };

  Model.countDocuments = async (filter = {}) => {
    const docs = await Model.find(filter);
    return docs.length;
  };

  Model.create = async (data) => {
    const doc = new Doc(data, table);
    await doc.save();
    return doc;
  };

  return Model;
}

export const GuildModel = createModel('guilds');
export const UserModel = createModel('users');
export const TicketModel = createModel('tickets');
export const GiveawayModel = createModel('giveaways');
export const TournamentModel = createModel('tournaments');

export async function connect() {
  logger.success('Connected to SQLite database');
}

export default db;
