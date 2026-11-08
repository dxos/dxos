//
// Copyright 2026 DXOS.org
//

import { Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import type { SqliteDatabase } from '@dxos/echo-sqlite';

import { Organization, Person, types } from '../schema.ts';
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

const typename = (type: (typeof types)[number]) => Type.getTypename(type)!;

const byTypename = new Map(types.map((type) => [typename(type), type]));

/** Declared rather than reflected, so the wire format is obvious from reading this file. */
const SCALARS: Record<string, readonly string[]> = {
  [typename(Organization)]: ['name'],
  [typename(Person)]: ['name', 'email'],
};

const REFS: Record<string, readonly string[]> = {
  [typename(Organization)]: [],
  [typename(Person)]: ['employer'],
};

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

/** Every local object of a known type, in wire form. */
const readLocal = async (db: SqliteDatabase): Promise<Map<string, SyncRecord>> => {
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
      for (const prop of SCALARS[name] ?? []) {
        const value: unknown = Obj.getValue(obj, [prop]);
        if (value !== undefined) {
          props[prop] = value;
        }
      }
      const refs: Record<string, string> = {};
      for (const prop of REFS[name] ?? []) {
        const ref: unknown = Obj.getValue(obj, [prop]);
        if (Ref.isRef(ref)) {
          const target = ref.target;
          const targetKey = target ? keyOf(target) : undefined;
          if (targetKey) {
            refs[prop] = targetKey;
          }
        }
      }
      out.set(key, { key, typename: name, props, refs });
    }
  }
  return out;
};

/** Find one local object by its foreign key. */
const findByKey = async (db: SqliteDatabase, key: string, name: string): Promise<Obj.Unknown | undefined> => {
  const type = byTypename.get(name);
  if (!type) {
    return undefined;
  }
  const [found] = await db.query(Query.select(Filter.foreignKeys(type as never, [foreignKey(key)]))).run();
  return found as Obj.Unknown | undefined;
};

/**
 * One round trip: send what changed locally, apply what came back.
 *
 * Returns how many records moved in each direction, so the UI can say something true.
 */
export const sync = async (
  db: SqliteDatabase,
  slug: string,
): Promise<{ sent: number; received: number; expiresAt: number }> => {
  const state = loadState(slug);
  const local = await readLocal(db);

  // Locally changed = fingerprint differs from what the store last agreed to.
  const changed = [...local.values()].filter((record) => fingerprint(record) !== state.hashes[record.key]);

  const response = await fetch(`/api/space/${slug}/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ since: state.version, records: changed }),
  });
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status} ${await response.text()}`);
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
    const existing = await findByKey(db, record.key, record.typename);
    if (record.deleted) {
      if (existing) {
        db.remove(existing);
      }
      continue;
    }
    if (existing) {
      Obj.update(existing, (draft) => {
        Object.assign(draft, record.props);
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
    const obj = await findByKey(db, record.key, record.typename);
    if (!obj) {
      continue;
    }
    for (const [prop, targetKey] of Object.entries(record.refs)) {
      const targetName = records.find((other) => other.key === targetKey)?.typename;
      const target =
        (targetName ? await findByKey(db, targetKey, targetName) : undefined) ??
        (await findByKey(db, targetKey, typename(Organization)));
      if (target) {
        Obj.update(obj, (draft) => {
          Obj.setValue(draft, [prop], Ref.make(target as never));
        });
      }
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
