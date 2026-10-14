//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Data from 'effect/Data';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { type Database, Filter, Obj, Ref, Type } from '@dxos/echo';
import { DatabaseImpl } from '@dxos/echo-client';
import { EntityId, URI } from '@dxos/keys';

/**
 * How an operation's input and output cross the worker boundary, where both sides open the same
 * space: live objects cannot be structured-cloned, and their JSON is neither the object nor anything
 * an operation accepts.
 *
 * - A stored object crosses as its id and heads; the receiver loads its own copy once it has them.
 * - A detached object crosses as its properties and is rebuilt as a detached object of its type.
 * - A reference crosses as its `{ '/': uri }` envelope and comes back a `Ref`.
 */

/** The receiver could not produce the value the sender named. */
export class WireError extends Data.TaggedError('WireError')<{ readonly message: string; readonly cause?: unknown }> {}

/** Document id to Automerge heads. */
export type Heads = Record<string, string[]>;

// Namespaced so that no plain value the model passes is read as one of these.
const STORED_KEY = '@dxos/agent-code-mode/stored';
const DETACHED_KEY = '@dxos/agent-code-mode/detached';
const REFERENCE_KEY = '/';

const Stored = Schema.Struct({
  id: Schema.String,
  spaceId: Schema.String,
  uri: Schema.String,
  heads: Schema.Array(Schema.String),
});

const Detached = Schema.Struct({ typename: Schema.String, properties: Schema.Record(Schema.String, Schema.Unknown) });

/** How long a receiver waits for an object's own document to catch up with the sender's edit. */
const CATCH_UP_TIMEOUT = Duration.seconds(5);

/**
 * Writes this side's changes and returns the space root's heads, which the receiver waits on before
 * resolving anything by id: the root routes every object to its document.
 */
export const settle = (db: Database.Database): Effect.Effect<Heads, WireError> =>
  Effect.tryPromise({
    try: async () => {
      await db.flush();
      if (!(db instanceof DatabaseImpl)) {
        return {};
      }
      const root = db.rootUrl?.replace(/^automerge:/, '');
      const { heads } = await db.getDocumentHeads();
      const rootHeads = Object.entries(heads).find(([id]) => id === root)?.[1];
      return root === undefined || rootHeads === undefined ? {} : { [root]: rootHeads };
    },
    catch: (cause) => new WireError({ message: 'Could not write the changes to hand over.', cause }),
  });

/** Waits until this replica carries `heads`. */
export const catchUp = (db: Database.Database, heads: Heads): Effect.Effect<void, WireError> =>
  db instanceof DatabaseImpl && Object.keys(heads).length > 0
    ? Effect.tryPromise({
        try: () => db.waitUntilHeadsReplicated({ heads }),
        catch: (cause) => new WireError({ message: "The other side's changes did not arrive.", cause }),
      }).pipe(
        // The host runs this after the evaluation's budget, so it needs its own bound.
        Effect.timeoutOrElse({
          duration: CATCH_UP_TIMEOUT,
          orElse: () => Effect.fail(new WireError({ message: "The other side's changes did not arrive in time." })),
        }),
      )
    : Effect.void;

/** The value as plain data, safe to post across the boundary. */
export const encode = (value: unknown, db: Database.Database): unknown => {
  if (Obj.isObject(value)) {
    const owner = Obj.getDatabase(value);
    if (owner === undefined) {
      return detached(value, db);
    }
    return {
      [STORED_KEY]: {
        id: value.id,
        spaceId: String(owner.spaceId),
        uri: Obj.getURI(value),
        heads: Obj.version(value).automergeHeads ?? [],
      },
    };
  }
  if (Ref.isRef(value)) {
    // The URI alone: a reference made from an object also carries that object, inline.
    return { [REFERENCE_KEY]: value.uri };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => encode(entry, db));
  }
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry, db)]));
  }
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
};

/** The value with every object and reference resolved against `db`. */
export const decode = (value: unknown, db: Database.Database): Effect.Effect<unknown, WireError> => {
  if (Array.isArray(value)) {
    return Effect.forEach(value, (entry) => decode(entry, db));
  }
  if (!isRecord(value)) {
    return Effect.succeed(value);
  }
  const stored = sole(value, STORED_KEY);
  if (stored !== undefined) {
    return Schema.is(Stored)(stored) ? load(stored, db) : malformed(STORED_KEY);
  }
  const detachedObject = sole(value, DETACHED_KEY);
  if (detachedObject !== undefined) {
    return Schema.is(Detached)(detachedObject) ? rebuild(detachedObject, db) : malformed(DETACHED_KEY);
  }
  const reference = sole(value, REFERENCE_KEY);
  if (URI.isURI(reference)) {
    return Effect.try({
      try: () => db.makeRef(reference),
      catch: (cause) => new WireError({ message: `Not a reference: ${reference}`, cause }),
    });
  }
  return Effect.forEach(Object.entries(value), ([key, entry]) =>
    decode(entry, db).pipe(Effect.map((decoded) => [key, decoded] as const)),
  ).pipe(Effect.map((entries) => Object.fromEntries(entries)));
};

const detached = (object: Obj.Unknown, db: Database.Database): unknown => {
  const typename = Obj.getTypename(object);
  if (typename === undefined) {
    return JSON.parse(JSON.stringify(object));
  }
  // System fields (`id`, `@type`, `@meta`, …) belong to this instance, not to what it describes.
  const properties = Object.fromEntries(
    Object.entries(Obj.toJSON(object)).filter(([key]) => key !== 'id' && !key.startsWith('@')),
  );
  return { [DETACHED_KEY]: { typename, properties: encode(properties, db) } };
};

/** Found by id in its own space, since the query service there has already indexed the sender's flush. */
const load = (
  { id, spaceId, uri, heads }: typeof Stored.Type,
  db: Database.Database,
): Effect.Effect<Obj.Unknown, WireError> =>
  Effect.tryPromise({
    try: async () =>
      spaceId === String(db.spaceId) && EntityId.isValid(id)
        ? (await db.query(Filter.id(id)).run())[0]
        : await db.makeRef(URI.make(uri)).load(),
    catch: (cause) => new WireError({ message: `Object not found: ${uri}`, cause }),
  }).pipe(
    Effect.flatMap((object) =>
      Obj.isObject(object)
        ? caughtUp(object, heads)
        : Effect.fail(new WireError({ message: `Object not found: ${uri}` })),
    ),
  );

/**
 * The object once its own document carries the sender's heads: the space-root barrier routes to the
 * object, but an edit to one this side already holds reaches its copy separately.
 */
const caughtUp = (object: Obj.Unknown, heads: readonly string[]): Effect.Effect<Obj.Unknown, WireError> =>
  Effect.sync(() => hasHeads(object, heads)).pipe(
    Effect.repeat({ until: (ready: boolean) => ready, schedule: Schedule.spaced(Duration.millis(10)) }),
    Effect.timeoutOrElse({
      duration: CATCH_UP_TIMEOUT,
      orElse: () => Effect.fail(new WireError({ message: `Changes to ${object.id} did not arrive.` })),
    }),
    Effect.as(object),
  );

/** Checking out a version needs its heads, so this side has them exactly when that succeeds. */
const hasHeads = (object: Obj.Unknown, heads: readonly string[]): boolean => {
  if (heads.length === 0) {
    return true;
  }
  try {
    Obj.getVersion(object, heads);
    return true;
  } catch {
    return false;
  }
};

const rebuild = (
  { typename, properties }: typeof Detached.Type,
  db: Database.Database,
): Effect.Effect<unknown, WireError> =>
  decode(properties, db).pipe(
    Effect.flatMap((decoded): Effect.Effect<unknown, WireError> => {
      const type = db.registry
        .list()
        .filter((entity) => Type.isType(entity) && Type.isObject(entity))
        .find((entity) => Type.getTypename(entity) === typename);
      // Without the type here, the description is the most this side can hand on.
      if (type === undefined || !Type.isObject(type) || !isRecord(decoded)) {
        return Effect.succeed({ '@type': typename, ...(isRecord(decoded) ? decoded : {}) });
      }
      return Effect.try({
        try: () => Obj.make(type, decoded),
        catch: (cause) => new WireError({ message: `Invalid ${typename}`, cause }),
      });
    }),
  );

const malformed = (key: string) => Effect.fail(new WireError({ message: `Malformed ${key} value.` }));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

/** The entry under `key` when it is the record's only one. */
const sole = (value: Record<string, unknown>, key: string): unknown => {
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === key ? value[key] : undefined;
};
