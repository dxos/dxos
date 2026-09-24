//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { DatabaseImpl } from '@dxos/echo-client';
import { EntityId, URI } from '@dxos/keys';

/**
 * How an operation's input and output cross the worker boundary when both ends hold an ECHO
 * database over the same space.
 *
 * Live objects cannot be structured-cloned, and their plain JSON is neither the object nor a
 * description an operation accepts. So an object that is already stored crosses as its id and the
 * receiver loads its own copy of the same object from the same space; a detached one crosses as a draft
 * (`{ '@type': typename, ...properties }`), the form an operation takes from a caller that cannot
 * hold a live object; a reference crosses as its `{ '/': uri }` envelope and comes back a `Ref`.
 */

/** A stored object named on the far side that this database cannot load. */
export class ObjectNotFoundError extends Data.TaggedError('ObjectNotFoundError')<{ readonly message: string }> {}

/** The far side's writes did not reach this database in time to read them. */
export class ReplicationError extends Data.TaggedError('ReplicationError')<{ readonly message: string }> {}

/** Document id to Automerge heads: what one side has written, for the other to wait on. */
export type Heads = Record<string, string[]>;

/** Marks a stored object by id; distinct from a reference's `/` so a `Ref` field stays a `Ref`. */
const OBJECT_KEY = '~object';

const REFERENCE_KEY = '/';

/**
 * Writes this side's changes and returns their heads, which travel with the call so the receiver
 * can {@link catchUp} before reading anything the call names.
 */
export const settle = (db: Database.Database): Effect.Effect<Heads> =>
  Effect.promise(async () => {
    await db.flush();
    return db instanceof DatabaseImpl ? (await db.getDocumentHeads()).heads : {};
  });

/**
 * Waits until this database's replica carries `heads`. A flush on the far side only reaches the
 * shared host, and a query or load run before this replica catches up comes back empty.
 */
export const catchUp = (db: Database.Database, heads: Heads): Effect.Effect<void, ReplicationError> =>
  db instanceof DatabaseImpl && Object.keys(heads).length > 0
    ? Effect.tryPromise({
        try: () => db.waitUntilHeadsReplicated({ heads }),
        catch: (error) => new ReplicationError({ message: `Waiting for the other side's writes: ${String(error)}` }),
      })
    : Effect.void;

/** The value as plain data, safe to post across the boundary. */
export const encode = (value: unknown): unknown => {
  if (Obj.isObject(value)) {
    return Obj.getDatabase(value) === undefined ? draftOf(value) : { [OBJECT_KEY]: value.id };
  }
  if (Ref.isRef(value)) {
    return toJson(value);
  }
  if (Array.isArray(value)) {
    return value.map(encode);
  }
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry)]));
  }
  return toJson(value);
};

/** The value with every stored object and reference resolved against `db`. */
export const decode = (value: unknown, db: Database.Database): Effect.Effect<unknown, ObjectNotFoundError> => {
  if (Array.isArray(value)) {
    return Effect.forEach(value, (entry) => decode(entry, db));
  }
  if (!isRecord(value)) {
    return Effect.succeed(value);
  }
  const id = soleString(value, OBJECT_KEY);
  if (id !== undefined) {
    return load(id, db);
  }
  const reference = soleString(value, REFERENCE_KEY);
  if (reference !== undefined && URI.isURI(reference)) {
    return Effect.succeed(db.makeRef(reference));
  }
  return Effect.forEach(Object.entries(value), ([key, entry]) =>
    decode(entry, db).pipe(Effect.map((decoded) => [key, decoded] as const)),
  ).pipe(Effect.map((entries) => Object.fromEntries(entries)));
};

/** Looked up by id, since both sides open the same space; the caller has already caught up. */
const load = (id: string, db: Database.Database): Effect.Effect<Obj.Unknown, ObjectNotFoundError> =>
  EntityId.isValid(id)
    ? Effect.promise(() => db.query(Filter.id(id)).run()).pipe(
        Effect.flatMap(([object]) =>
          object === undefined
            ? Effect.fail(new ObjectNotFoundError({ message: `Object not found: ${id}` }))
            : Effect.succeed(object),
        ),
      )
    : Effect.fail(new ObjectNotFoundError({ message: `Not an object id: ${id}` }));

/** A detached object as the description an operation instantiates from. */
const draftOf = (object: Obj.Unknown): unknown => {
  const { id: _id, '@type': _type, '@meta': _meta, ...properties } = Obj.toJSON(object);
  const typename = Obj.getTypename(object);
  return typename === undefined ? properties : { '@type': typename, ...properties };
};

const toJson = (value: unknown): unknown => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

/** The string under `key` when it is the record's only entry. */
const soleString = (value: Record<string, unknown>, key: string): string | undefined => {
  const keys = Object.keys(value);
  const entry = value[key];
  return keys.length === 1 && keys[0] === key && typeof entry === 'string' ? entry : undefined;
};
