//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as EffectFunction from 'effect/Function';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

import { type Database, Filter, Key, Query, type QueryAST, Scope, Type } from '@dxos/echo';
import {
  ReferenceAnnotationId,
  type ReferenceAnnotationValue,
  getTypeAnnotation,
  unwrapOptional,
} from '@dxos/echo/internal';
import { runAndForwardErrors } from '@dxos/effect';
import { DXN, EchoURI } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { Person } from '@dxos/types';

// TODO(wittjosiah): Factor out and add tests.
// TODO(wittjosiah): Support arbitrary type imports.
export const evalQuery = (queryString: string): Query.Any => {
  const globals = { Query, Filter, Person };
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    return new Function(...Object.keys(globals), `return ${queryString}`)(...Object.values(globals));
  } catch (err) {
    log.catch(err);
    return Query.select(Filter.nothing());
  }
};

export const resolveSchemaWithRegistry = (db: Database.Database, query: QueryAST.Query) => {
  const resolve = Effect.fn(function* (dxn: string) {
    const typename = DXN.isDXN(dxn) ? DXN.getName(dxn) : undefined;
    if (!typename) {
      return Option.none<Type.AnyEntity>();
    }

    const types = yield* Effect.promise(() =>
      db.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry())).run(),
    );
    const schema = types.find((t) => Type.getTypename(t) === typename);
    return Option.fromNullable(schema);
  });

  return resolveType(query, resolve).pipe(
    Effect.map((type) => Option.getOrUndefined(type)),
    runAndForwardErrors,
  );
};

const resolveType = (
  query: QueryAST.Query,
  resolve: (dxn: string) => Effect.Effect<Option.Option<Type.AnyEntity>>,
): Effect.Effect<Option.Option<Type.AnyEntity>> => {
  return Match.value(query).pipe(
    Match.withReturnType<Effect.Effect<Option.Option<Type.AnyEntity>>>(),
    Match.when({ type: 'select' }, ({ filter }) =>
      typenameFromFilter(filter).pipe(
        Option.map((typename) => resolve(typename)),
        Option.getOrElse(() => Effect.succeed(Option.none<Type.AnyEntity>())),
      ),
    ),
    Match.when({ type: 'filter' }, ({ filter, selection }) => {
      const filterResult = typenameFromFilter(filter);
      return Option.isSome(filterResult)
        ? filterResult.pipe(
            Option.map((typename) => resolve(typename)),
            Option.getOrElse(() => Effect.succeed(Option.none<Type.AnyEntity>())),
          )
        : resolveType(selection, resolve);
    }),
    Match.when({ type: 'reference-traversal' }, ({ anchor, property }) =>
      resolveType(anchor, resolve).pipe(
        Effect.map((base) =>
          base.pipe(
            Option.map((type) => SchemaAST.getPropertySignatures(Type.getSchema(type).ast)),
            Option.flatMap((properties) => Array.findFirst(properties, (p) => p.name === property)),
            Option.flatMap((property) =>
              SchemaAST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotationId)(unwrapOptional(property)),
            ),
            Option.map((annotation) => annotation.typename),
          ),
        ),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeed(Option.none<Type.AnyEntity>()),
            onSome: (typename) => resolve(DXN.make(typename)),
          }),
        ),
      ),
    ),
    Match.when({ type: 'relation', filter: Match.defined }, ({ filter }) =>
      typenameFromFilter(filter).pipe(
        Option.map((typename) => resolve(typename)),
        Option.getOrElse(() => Effect.succeed(Option.none<Type.AnyEntity>())),
      ),
    ),
    Match.when({ type: 'relation-traversal' }, ({ anchor, direction }) =>
      resolveType(anchor, resolve).pipe(
        Effect.map((base) =>
          base.pipe(
            Option.map((type) => getTypeAnnotation(Type.getSchema(type))),
            Option.flatMap((annotation) =>
              Option.fromNullable(direction === 'source' ? annotation?.sourceSchema : annotation?.targetSchema),
            ),
          ),
        ),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeed(Option.none<Type.AnyEntity>()),
            onSome: (typename) => resolve(typename),
          }),
        ),
      ),
    ),
    Match.when({ type: 'options' }, ({ query }) => resolveType(query, resolve)),
    Match.orElse((_q) => {
      // TODO(wittjosiah): Implement other cases.
      return Effect.succeed(Option.none<Type.AnyEntity>());
    }),
  );
};

const typenameFromFilter = (filter: QueryAST.Filter): Option.Option<string> =>
  Match.value(filter).pipe(
    Match.withReturnType<Option.Option<string>>(),
    Match.when({ type: 'object' }, ({ typename }) => Option.fromNullable(typename)),
    Match.when({ type: 'and' }, ({ filters }) =>
      EffectFunction.pipe(filters, Array.map(typenameFromFilter), Array.findFirst(Option.isSome), Option.flatten),
    ),
    Match.when({ type: 'or' }, ({ filters }) =>
      EffectFunction.pipe(filters, Array.map(typenameFromFilter), Array.findFirst(Option.isSome), Option.flatten),
    ),
    Match.orElse(() => Option.none()),
  );

// TODO(wittjosiah): Currently assumes from scope is at the top-level of the ast.
export const getQueryTarget = (query: QueryAST.Query, space?: Space) => {
  return Match.value(query).pipe(
    Match.when({ type: 'from' }, ({ from }) => {
      if (from._tag !== 'scope') {
        return space?.db;
      }
      const feedScopes = from._tag === 'scope' ? from.scopes.filter((s) => s._tag === 'feed') : [];
      const result = Option.fromNullable(feedScopes[0]).pipe(
        Option.map((s) => s.feedUri),
        Option.flatMap((feedUri) => Option.fromNullable(EchoURI.tryParse(String(feedUri)))),
        Option.flatMap((echoUri) => {
          const objectId = EchoURI.getObjectId(echoUri);
          if (!objectId || !Key.ObjectId.isValid(objectId)) {
            return Option.none();
          }
          return Option.fromNullable(space?.queues.get(echoUri));
        }),
      );
      // Skip query when a requested feed is not found (structurally invalid DXN or valid DXN
      // referencing a feed not present in space.queues, e.g. not yet synced) to avoid 400 errors.
      // TODO(wittjosiah): Can we handle this upstream?
      if (feedScopes.length > 0 && Option.isNone(result)) {
        return undefined;
      }
      return Option.getOrElse(result, () => space?.db);
    }),
    Match.orElse(() => space?.db),
  );
};
