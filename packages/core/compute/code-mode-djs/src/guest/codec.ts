//
// Copyright 2026 DXOS.org
//

import { Entity, Obj, Ref, Type } from '@dxos/echo';
import { URI } from '@dxos/keys';

import {
  DETACHED_KEY,
  type DetachedValue,
  REFERENCE_KEY,
  STORED_KEY,
  type StoredValue,
  isRecord,
  sole,
} from '../protocol.ts';
import { type BridgeDatabase } from './database.ts';

/**
 * A guest value as plain data for the host: a stored object as its id, an object in no database as
 * its type and fields, a reference as its `{ '/': uri }` envelope. The database is flushed first by
 * the caller, so every stored id names an object the host holds.
 */
export const encode = (value: unknown, db: BridgeDatabase): unknown => {
  if (Obj.isObject(value)) {
    if (Obj.getDatabase(value) === db) {
      const stored: StoredValue = { id: value.id, uri: Obj.getURI(value) };
      return { [STORED_KEY]: stored };
    }
    const typename = Entity.getTypeURI(value);
    if (typename === undefined) {
      return JSON.parse(JSON.stringify(value));
    }
    const properties = Object.fromEntries(
      Object.entries(Obj.toJSON(value)).filter(([key]) => key !== 'id' && !key.startsWith('@')),
    );
    const detached: DetachedValue = { typename, properties };
    return { [DETACHED_KEY]: detached };
  }
  if (Ref.isRef(value)) {
    return { [REFERENCE_KEY]: value.uri };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => encode(entry, db));
  }
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry, db)]));
  }
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }
  if (typeof value === 'bigint') {
    return String(value);
  }
  return typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
};

/** A host value with every object and reference made live in the guest database. */
export const decode = async (value: unknown, db: BridgeDatabase): Promise<unknown> => {
  if (Array.isArray(value)) {
    const entries: unknown[] = [];
    for (const entry of value) {
      entries.push(await decode(entry, db));
    }
    return entries;
  }
  if (!isRecord(value)) {
    return value;
  }
  const stored = sole(value, STORED_KEY);
  if (isRecord(stored) && typeof stored.id === 'string' && typeof stored.uri === 'string') {
    const row = isRecord(stored.row) ? stored.row : undefined;
    if (row && typeof row.id === 'string' && isRecord(row.json) && typeof row.version === 'string') {
      return db.hydrate({ id: row.id, json: row.json, version: row.version });
    }
    return db.load(stored.uri);
  }
  const detached = sole(value, DETACHED_KEY);
  if (isRecord(detached) && typeof detached.typename === 'string' && isRecord(detached.properties)) {
    const properties = await decode(detached.properties, db);
    const type = db.registry.getByURI(detached.typename);
    return type && Type.isType(type) && Type.isObject(type) && isRecord(properties)
      ? Obj.make(type, properties)
      : { '@type': detached.typename, ...(isRecord(properties) ? properties : {}) };
  }
  const reference = sole(value, REFERENCE_KEY);
  if (typeof reference === 'string' && URI.isURI(reference)) {
    return db.makeRef(reference);
  }
  const entries: [string, unknown][] = [];
  for (const [key, entry] of Object.entries(value)) {
    entries.push([key, await decode(entry, db)]);
  }
  return Object.fromEntries(entries);
};
