//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as EffectFunction from 'effect/Function';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { DXN, Filter, Query, type QueryAST } from '@dxos/echo';
import {
  ReferenceAnnotationId,
  type ReferenceAnnotationValue,
  getTypeAnnotation,
  unwrapOptional,
} from '@dxos/echo/internal';
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

export const resolveSchemaWithClientAndSpace = (space: Space, query: QueryAST.Query) => {
  const resolve = Effect.fn(function* (dxn: string) {
    const typename = DXN.parse(dxn).asTypeDXN()?.type;
    if (!typename) {
      return Option.none();
    }

    const query = space.db.schemaRegistry.query({ typename, location: ['database', 'runtime'] });
    const schemas = yield* Effect.promise(() => query.run());
    return Array.head(schemas);
  });

  return resolveSchema(query, resolve).pipe(
    Effect.map((schema) => Option.getOrUndefined(schema)),
    Effect.runPromise,
  );
};

const resolveSchema = (
  query: QueryAST.Query,
  resolve: (dxn: string) => Effect.Effect<Option.Option<Schema.Schema.AnyNoContext>>,
): Effect.Effect<Option.Option<Schema.Schema.AnyNoContext>> => {
  return Match.value(query).pipe(
    Match.withReturnType<Effect.Effect<Option.Option<Schema.Schema.AnyNoContext>>>(),
    // TODO(wittjosiah): Reconcile with filter match?
    Match.when({ type: 'select' }, ({ filter }) =>
      typenameFromFilter(filter).pipe(
        Option.map((typename) => resolve(typename)),
        Option.getOrElse(() => Effect.succeed(Option.none<Schema.Schema.AnyNoContext>())),
      ),
    ),
    Match.when({ type: 'filter' }, ({ filter }) =>
      typenameFromFilter(filter).pipe(
        Option.map((typename) => resolve(typename)),
        Option.getOrElse(() => Effect.succeed(Option.none<Schema.Schema.AnyNoContext>())),
      ),
    ),
    Match.when({ type: 'reference-traversal' }, ({ anchor, property }) =>
      resolveSchema(anchor, resolve).pipe(
        Effect.map((base) =>
          base.pipe(
            Option.map((schema) => SchemaAST.getPropertySignatures(schema.ast)),
            Option.flatMap((properties) => Array.findFirst(properties, (p) => p.name === property)),
            Option.flatMap((property) =>
              SchemaAST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotationId)(unwrapOptional(property)),
            ),
            Option.map((annotation) => annotation.typename),
          ),
        ),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeed(Option.none()),
            onSome: (typename) => resolve(DXN.fromTypename(typename).toString()),
          }),
        ),
      ),
    ),
    Match.when({ type: 'relation', filter: Match.defined }, ({ filter }) =>
      typenameFromFilter(filter).pipe(
        Option.map((typename) => resolve(typename)),
        Option.getOrElse(() => Effect.succeed(Option.none<Schema.Schema.AnyNoContext>())),
      ),
    ),
    Match.when({ type: 'relation-traversal' }, ({ anchor, direction }) =>
      resolveSchema(anchor, resolve).pipe(
        Effect.map((base) =>
          base.pipe(
            Option.map((schema) => getTypeAnnotation(schema)),
            Option.flatMap((annotation) =>
              Option.fromNullable(direction === 'source' ? annotation?.sourceSchema : annotation?.targetSchema),
            ),
          ),
        ),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeed(Option.none()),
            onSome: (typename) => resolve(typename),
          }),
        ),
      ),
    ),
    Match.when({ type: 'options' }, ({ query }) => resolveSchema(query, resolve)),
    Match.orElse((_q) => {
      // TODO(wittjosiah): Implement other cases.
      return Effect.succeed(Option.none());
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

// TODO(wittjosiah): Currently assumes options is at the top-level of the ast.
export const getQueryTarget = (query: QueryAST.Query, space?: Space) => {
  return Match.value(query).pipe(
    Match.when({ type: 'options' }, ({ options }) => {
      return Option.fromNullable(options.queues).pipe(
        Option.flatMap((queues) => Array.head(queues)),
        Option.flatMap((queueDxn) => Option.fromNullable(DXN.tryParse(queueDxn))),
        Option.flatMap((queueDxn) => Option.fromNullable(space?.queues.get(queueDxn))),
        Option.getOrElse(() => space),
      );
    }),
    Match.orElse(() => space),
  );
};
