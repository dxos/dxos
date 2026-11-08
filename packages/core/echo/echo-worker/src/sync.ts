//
// Copyright 2026 DXOS.org
//

import { Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import type { SqliteDatabase } from '@dxos/echo-sqlite';

import { SOURCE, type SyncRecord, type SyncResponse } from './protocol.ts';

/**
 * Two-way sync against the slug's Durable Object.
 *
 * The DO assigns every record a version in a total order, so last-writer-wins is well defined
 * rather than a race. Remote records are applied through the ECHO API — `db.add` / `Obj.update` —
 * never by writing `echo_entities`, because echo-sqlite invalidates queries from its own commits
 * only; a raw-SQL import would never reach the UI.
 *
 * Objects are matched on a foreign key in `Obj.Meta.keys`, not the ECHO id, which `Obj.make` mints
 * itself and cannot be given.
 */

/** The ECHO types a graph holds; every call takes the same set the database was opened with. */
export type SyncTypes = readonly Type.AnyObj[];

const typename = (type: Type.AnyObj) => Type.getTypename(type)!;

const index = (types: SyncTypes) => new Map(types.map((type) => [typename(type), type]));

export const foreignKey = (key: string) => ({ source: SOURCE, id: key });

const keyOf = (obj: Obj.Unknown): string | undefined => Obj.getKeys(obj, SOURCE)[0]?.id;

export type SyncState = {
  /** The highest version applied from the store. */
  version: number;
  /** Per-key fingerprint of what was last in agreement with the store. */
  hashes: Record<string, string>;
};

const stateKey = (slug: string) => `echo-sqlite-demo:${slug}`;

export const loadState = (slug: string): SyncState => {
  try {
    const raw = localStorage.getItem(stateKey(slug));
    if (raw) {
      const parsed = JSON.parse(raw) as SyncState;
      if (Number.isSafeInteger(parsed?.version)) {
        return { version: parsed.version, hashes: parsed.hashes ?? {} };
      }
    }
  } catch {
    // A corrupt or blocked store just means a full re-sync.
  }
  return { version: 0, hashes: {} };
};

const saveState = (slug: string, state: SyncState): void => {
  try {
    localStorage.setItem(stateKey(slug), JSON.stringify(state));
  } catch {
    // Private windows block it; sync still works, it just resends everything.
  }
};

/** Cheap and stable — only used to spot a local edit, never for security. */
const fingerprint = (record: SyncRecord): string =>
  JSON.stringify([record.typename, record.props, record.refs, record.deleted ?? false]);

/**
 * Every local object of a known type, in wire form.
 *
 * Fields are read off the object rather than from a declared list: a `Ref` is an edge, anything
 * else is a value. Nothing here needs updating when a type gains a field.
 */
const readLocal = async (db: SqliteDatabase, types: SyncTypes): Promise<Map<string, SyncRecord>> => {
  const out = new Map<string, SyncRecord>();
  for (const type of types) {
    const name = typename(type);
    const objects = await db.query(Filter.type(type)).run();
    for (const obj of objects) {
      const key = keyOf(obj);
      if (!key) {
        // Not created by this app (or created before sync existed); it cannot be correlated.
        continue;
      }
      const props: Record<string, unknown> = {};
      const refs: Record<string, string | string[]> = {};
      for (const [prop, value] of Object.entries(obj)) {
        if (prop === 'id' || value === undefined) {
          continue;
        }
        if (Ref.isRef(value)) {
          const targetKey = value.target ? keyOf(value.target) : undefined;
          if (targetKey) {
            refs[prop] = targetKey;
          }
        } else if (Array.isArray(value) && value.some(Ref.isRef)) {
          // A multi-valued edge; a target that is not resident contributes nothing rather than a hole.
          const targetKeys = value.filter(Ref.isRef).flatMap((ref) => {
            const targetKey = ref.target ? keyOf(ref.target) : undefined;
            return targetKey ? [targetKey] : [];
          });
          if (targetKeys.length > 0) {
            refs[prop] = targetKeys;
          }
        } else {
          // Through JSON, so a live array or nested object leaves its proxy behind.
          props[prop] = JSON.parse(JSON.stringify(value));
        }
      }
      out.set(key, { key, typename: name, props, refs });
    }
  }
  return out;
};

/** Find one local object by its foreign key. */
const findByKey = async (db: SqliteDatabase, key: string, type: Type.AnyObj): Promise<Obj.Unknown | undefined> => {
  const [found] = await db.query(Query.select(Filter.foreignKeys(type as never, [foreignKey(key)]))).run();
  return found as Obj.Unknown | undefined;
};

/** The same, when the record's type is not known: a ref names its target's key, not its type. */
const findAnyByKey = async (db: SqliteDatabase, key: string, types: SyncTypes): Promise<Obj.Unknown | undefined> => {
  for (const type of types) {
    const found = await findByKey(db, key, type);
    if (found) {
      return found;
    }
  }
  return undefined;
};

/**
 * One round trip: send what changed locally, apply what came back.
 *
 * Returns how many records moved in each direction, so the UI can say something true.
 */
export const sync = async (
  db: SqliteDatabase,
  slug: string,
  types: SyncTypes,
): Promise<{ sent: number; received: number; expiresAt: number }> => {
  const byTypename = index(types);
  const state = loadState(slug);
  const local = await readLocal(db, types);

  // Locally changed = fingerprint differs from what the store last agreed to.
  const changed = [...local.values()].filter((record) => fingerprint(record) !== state.hashes[record.key]);

  const response = await fetch(`/api/space/${slug}/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ since: state.version, records: changed }),
  });
  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(`Sync failed: ${response.status}${detail ? ` ${detail}` : ''}`);
  }
  const { version, records, expiresAt } = (await response.json()) as SyncResponse;

  // Only records the store knows this client has not seen; the ones it just sent come back too.
  const incoming = records.filter(
    (record) => local.get(record.key) === undefined || fingerprint(record) !== state.hashes[record.key],
  );

  // Pass 1: scalars, so every ref target exists before pass 2 wires edges.
  for (const record of incoming) {
    const type = byTypename.get(record.typename);
    if (!type) {
      continue;
    }
    const existing = await findByKey(db, record.key, type);
    if (record.deleted) {
      if (existing) {
        db.remove(existing);
      }
      continue;
    }
    if (existing) {
      Obj.update(existing, (existing) => {
        Object.assign(existing, record.props);
      });
    } else {
      db.add(Obj.make(type as never, { [Obj.Meta]: { keys: [foreignKey(record.key)] }, ...record.props } as never));
    }
  }
  await db.flush();

  // Pass 2: edges.
  for (const record of incoming) {
    if (record.deleted || Object.keys(record.refs).length === 0) {
      continue;
    }
    const type = byTypename.get(record.typename);
    const obj = type && (await findByKey(db, record.key, type));
    if (!obj) {
      continue;
    }
    for (const [prop, value] of Object.entries(record.refs)) {
      const many = Array.isArray(value);
      const targets: Obj.Unknown[] = [];
      for (const targetKey of many ? value : [value]) {
        const targetName = records.find((other) => other.key === targetKey)?.typename;
        const targetType = targetName ? byTypename.get(targetName) : undefined;
        const target = targetType
          ? await findByKey(db, targetKey, targetType)
          : await findAnyByKey(db, targetKey, types);
        if (target) {
          targets.push(target);
        }
      }
      if (targets.length === 0) {
        continue;
      }
      Obj.update(obj, (obj) => {
        Obj.setValue(
          obj,
          [prop],
          many ? targets.map((target) => Ref.make(target as never)) : Ref.make(targets[0] as never),
        );
      });
    }
  }
  await db.flush();

  // Agreement is now the union, so fingerprint everything the store holds plus what was sent.
  const hashes: Record<string, string> = { ...state.hashes };
  for (const record of [...records, ...changed]) {
    hashes[record.key] = fingerprint(record);
  }
  saveState(slug, { version, hashes });

  return { sent: changed.length, received: incoming.length, expiresAt };
};
