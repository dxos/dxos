//
// Copyright 2026 DXOS.org
//

import { DatabaseSync } from 'node:sqlite';

/**
 * Opens an extracted DXOS SQLite database read-only.
 *
 * @param {string} dbPath
 * @returns {DatabaseSync}
 */
export const openDatabase = (dbPath) =>
  new DatabaseSync(dbPath, {
    readOnly: true,
    enableForeignKeyConstraints: true,
  });

/**
 * @param {DatabaseSync} db
 * @param {string} sql
 * @param {unknown[]} [params]
 * @returns {unknown[]}
 */
export const all = (db, sql, params = []) => db.prepare(sql).all(...params);

/**
 * @param {DatabaseSync} db
 * @param {string} sql
 * @param {unknown[]} [params]
 * @returns {unknown | undefined}
 */
export const get = (db, sql, params = []) => db.prepare(sql).get(...params);

/**
 * @param {DatabaseSync} db
 * @param {string} table
 * @returns {boolean}
 */
export const tableExists = (db, table) =>
  Boolean(get(db, "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?", [table])?.ok);

/**
 * @param {DatabaseSync} db
 * @param {string} table
 * @returns {number}
 */
export const countRows = (db, table) => {
  if (!tableExists(db, table)) {
    return 0;
  }
  return Number(get(db, `SELECT COUNT(*) AS n FROM ${table}`)?.n ?? 0);
};
