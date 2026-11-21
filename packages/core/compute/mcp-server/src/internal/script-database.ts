//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import { type Database, type Entity, Filter, Obj, Query, type Ref, Scope, Type } from '@dxos/echo';
import { DXN, EID, EntityId, type SpaceId, URI } from '@dxos/keys';
import { deepMapValues } from '@dxos/util';

import { type ToolFailure, failure } from './failure.ts';
import * as snapshotInternal from './snapshot.ts';
import * as spaceInternal from './space.ts';

/** The verbs a script reads and changes objects with, against the database of its space rather than an operation. */
export const VERBS = ['get', 'query', 'search', 'update'] as const;
export type Verb = (typeof VERBS)[number];

export const isVerb = (binding: string): binding is Verb => VERBS.some((verb) => verb === binding);

/**
 * Answers one database verb. Objects leave in `invoke`'s wire form: snapshots whose references are `{"/": uri}`
 * envelopes naming the space, so what `get` returns can go straight into `invoke`, and the other way round.
 */
export const call = (
  db: Database.Database,
  spaceId: SpaceId,
  verb: Verb,
  args: readonly unknown[],
): Effect.Effect<unknown, ToolFailure> => {
  const wire = (value: unknown) => toWire(value, spaceId);
  switch (verb) {
    case 'get':
      return targetId(args[0], spaceId).pipe(
        Effect.flatMap((id) => find(db, id)),
        Effect.map((found) => (found === undefined ? undefined : wire(found))),
      );
    case 'query': {
      const [typename, props, options] = args;
      return Effect.gen(function* () {
        if (props != null && !isRecord(props)) {
          return yield* Effect.fail(failure('invalid_request', 'query takes its props as an object of field values.'));
        }
        const filter = yield* typeFilter(db, typename, 'query');
        // Narrowed by the properties in a second step: the planner takes properties on a type filter, but not inside
        // the `Filter.or` a stored copy of the type adds.
        const typed = isRecord(props) ? Query.select(filter).select(Filter.props(props)) : Query.select(filter);
        return wire(yield* run(db, yield* scoped(db, spaceId, typed, options)));
      });
    }
    case 'search': {
      const [text, typename, options] = args;
      return Effect.gen(function* () {
        if (!Predicate.isString(text) || text.trim().length === 0) {
          return yield* Effect.fail(failure('invalid_request', 'search takes the text to find as a string.'));
        }
        const matches = Query.select(Filter.text(text, { type: 'full-text' }));
        const typed = typename == null ? matches : matches.select(yield* typeFilter(db, typename, 'search'));
        const query = yield* scoped(db, spaceId, typed, options);
        // Flushed first, so what the script just wrote is in the full-text index, which lags the primary one.
        yield* flush(db, { secondaryIndexes: true });
        return wire(yield* run(db, query));
      });
    }
    case 'update': {
      const [target, patch] = args;
      return Effect.gen(function* () {
        if (!isRecord(patch)) {
          return yield* Effect.fail(
            failure(
              'invalid_request',
              'update takes the fields to replace as an object: update(id, { field: value }).',
            ),
          );
        }
        const reserved = Object.keys(patch).find((key) => key === 'id' || key.startsWith('@'));
        if (reserved !== undefined) {
          return yield* Effect.fail(failure('invalid_request', `update cannot change ${reserved}.`));
        }
        const id = yield* targetId(target, spaceId);
        const object = yield* find(db, id);
        if (object === undefined || !Obj.isObject(object)) {
          return yield* Effect.fail(failure('invalid_request', `No object ${id} in space ${spaceId}.`));
        }
        yield* Effect.try({
          try: () =>
            Obj.update(object, (object) => {
              for (const [key, value] of Object.entries(patch)) {
                Obj.setValue(object, [key], toRefs(db, value));
              }
            }),
          catch: (error) => failure('invalid_request', `update of ${id} was refused: ${describe(error)}`),
        });
        // Stored before the verb answers, as the operation it replaces does: nothing later flushes for the script.
        yield* flush(db);
        return wire(object);
      });
    }
  }
};

/** The object a script names: its id, an `echo:` URI, a `{"/": uri}` envelope, or a snapshot carrying its id. */
const targetId = (target: unknown, spaceId: SpaceId): Effect.Effect<EntityId, ToolFailure> => {
  const uri = Predicate.isString(target)
    ? target
    : Predicate.isObject(target) && Predicate.isString(target['/'])
      ? target['/']
      : undefined;
  if (uri !== undefined) {
    if (EntityId.isValid(uri)) {
      return Effect.succeed(uri);
    }
    const eid = EID.tryParse(uri);
    const id = eid === undefined ? undefined : EID.getEntityId(eid);
    const space = eid === undefined ? undefined : EID.getSpaceId(eid);
    if (id !== undefined && space !== undefined && space !== spaceId) {
      return Effect.fail(
        failure('invalid_request', `${uri} is in another space; this script reads and changes ${spaceId} only.`),
      );
    }
    if (id !== undefined) {
      return Effect.succeed(id);
    }
  }
  if (Predicate.isObject(target) && Predicate.isString(target.id) && EntityId.isValid(target.id)) {
    return Effect.succeed(target.id);
  }
  return Effect.fail(
    failure('invalid_request', `Not an object id or reference: ${JSON.stringify(target) ?? String(target)}.`),
  );
};

/**
 * The filter for objects of a typename, as `space.queryObjects` builds it: the bare typename, plus every copy of the
 * type stored in the space, since objects of a stored type carry its `echo:` id, which the typename does not match.
 */
const typeFilter = (db: Database.Database, typename: unknown, verb: Verb): Effect.Effect<Filter.Any, ToolFailure> =>
  Effect.gen(function* () {
    if (!Predicate.isString(typename) || !Schema.is(DXN.NameSchema)(typename)) {
      return yield* Effect.fail(failure('invalid_request', `${verb} takes a typename such as 'org.dxos.type.task'.`));
    }
    const declared = yield* run(
      db,
      Query.select(Filter.and(Filter.type(Type.Type), Filter.key(typename))).from(Scope.space(), Scope.registry()),
    );
    const stored = declared.filter(Type.isType).filter((type) => Type.getDatabase(type) != null);
    return stored.length === 0
      ? Filter.type(DXN.make(typename))
      : Filter.or(Filter.type(DXN.make(typename)), ...stored.map((type) => Filter.type(type)));
  });

/**
 * A query narrowed to what sits under `options.in`, reading feeds when `options.feeds` asks or when `in` is given: a
 * feed's content is reached only through its feed.
 */
const scoped = (
  db: Database.Database,
  spaceId: SpaceId,
  query: Query.Any,
  options: unknown,
): Effect.Effect<Query.Any, ToolFailure> =>
  Effect.gen(function* () {
    if (options != null && !isRecord(options)) {
      return yield* Effect.fail(failure('invalid_request', 'The options are an object: { feeds?, in? }.'));
    }
    const named = options?.in ?? [];
    if (!Array.isArray(named)) {
      return yield* Effect.fail(failure('invalid_request', 'in takes a list of objects, ids or references.'));
    }
    const parents: (Obj.Unknown | Ref.Unknown)[] = [];
    for (const target of named) {
      const id = yield* targetId(target, spaceId);
      const parent = yield* find(db, id);
      if (!Obj.isObject(parent)) {
        return yield* Effect.fail(failure('invalid_request', `No object ${id} in space ${spaceId}.`));
      }
      parents.push(parent);
    }
    const narrowed = parents.length > 0 ? query.select(Filter.childOf(parents)) : query;
    // Scoped to this space's database: feeds named without a space match nothing in the index.
    return options?.feeds === true || parents.length > 0 ? narrowed.from(db, { includeFeeds: true }) : narrowed;
  });

const find = (db: Database.Database, id: EntityId): Effect.Effect<Entity.Unknown | undefined, ToolFailure> =>
  run(db, Query.select(Filter.id(id))).pipe(Effect.map(([found]) => found));

const run = (db: Database.Database, query: Query.Any): Effect.Effect<Entity.Unknown[], ToolFailure> =>
  Effect.tryPromise({
    try: () => db.query(query).run(),
    catch: (error) => failure('operation_failed', `The query failed: ${describe(error)}`),
  });

const flush = (db: Database.Database, options?: Database.FlushOptions): Effect.Effect<void, ToolFailure> =>
  Effect.tryPromise({
    try: () => db.flush(options),
    catch: (error) => failure('operation_failed', `Writes did not save: ${describe(error)}`),
  });

/** A patch arrives in wire form: a reference envelope at any depth becomes a reference into the database. */
const toRefs = (db: Database.Database, value: unknown): unknown =>
  deepMapValues(value, (entry, recurse) => (isEnvelope(entry) ? db.makeRef(URI.make(entry['/'])) : recurse(entry)));

/** What `invoke` would answer with for these objects: JSON with every reference naming the space. */
const toWire = (value: unknown, spaceId: SpaceId): unknown =>
  spaceInternal.qualifyRefs(JSON.parse(JSON.stringify(snapshotInternal.entities(value)) ?? 'null'), spaceId);

const isEnvelope = (value: unknown): value is { readonly '/': string } =>
  Predicate.isObject(value) && Object.keys(value).length === 1 && Predicate.isString(value['/']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error));
