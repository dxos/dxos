//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, type Type } from '@dxos/echo';

// #region add
/** Makes a record of `type` from `values` and adds it to the database. */
export const addRecord = (
  db: Database.Database,
  type: Type.AnyObj,
  values: Record<string, unknown>,
) => db.add(Obj.make(type, values));
// #endregion

// #region subscribe
/**
 * Calls `onChange` after each change to `record`; returns a function that
 * stops it.
 */
export const watchRecord = (record: Obj.Unknown, onChange: () => void) =>
  Obj.subscribe(record, onChange);
// #endregion

// #region update
/** Writes `changes` to `record` as one change. */
export const updateRecord = (
  record: Obj.Unknown,
  changes: Record<string, unknown>,
) =>
  Obj.update(record, (record) => {
    Object.assign(record, changes);
  });
// #endregion

// #region remove
/** Removes `record` from the database. */
export const removeRecord = (db: Database.Database, record: Obj.Unknown) =>
  db.remove(record);
// #endregion
