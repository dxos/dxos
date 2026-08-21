//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Scope, Type } from '@dxos/echo';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.QueryObjects> = SpaceOperation.QueryObjects.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      in: parents,
      typename,
      text,
      includeContent = false,
      limit = 10,
      includeQueues = false,
    }) {
      const { db } = yield* Database.Service;

      const present = (value: string | undefined): value is string => !!value;
      const selected = yield* Match.value({ text, typename }).pipe(
        Match.withReturnType<Effect.Effect<Query.Any, Error, Database.Service>>(),
        Match.when({ text: present, typename: present }, ({ text, typename }) =>
          resolveType(typename).pipe(Effect.map((type) => fullText(text).select(Filter.type(type)))),
        ),
        Match.when({ text: present }, ({ text }) => Effect.succeed(fullText(text))),
        Match.when({ typename: present }, ({ typename }) =>
          resolveType(typename).pipe(Effect.map((type) => Query.select(Filter.type(type)))),
        ),
        Match.orElse(() => Effect.succeed(Query.select(Filter.everything()))),
      );

      const scoped = parents && parents.length > 0 ? selected.select(Filter.childOf(parents)) : selected;
      // Queues must be scoped to the current space: `from({ allFeedsFromSpaces: true })` alone has no
      // spaceIds, so the SQL index returns nothing (see EntityMetaIndex.buildSourceCondition).
      const query = includeQueues ? scoped.limit(limit).from(db, { includeFeeds: true }) : scoped.limit(limit);

      yield* Database.flush();
      const results = yield* Database.query(query).run;
      return {
        results: results.map((object) =>
          includeContent
            ? object
            : { dxn: Obj.getURI(object), typename: Obj.getTypename(object), label: Obj.getLabel(object) },
        ),
      };
    }),
  ),
);

export default handler;

/** Every term must match, so the words of a phrase narrow the result rather than widening it. */
const fullText = (text: string): Query.Any =>
  Query.all(...text.split(' ').map((term) => Query.select(Filter.text(term, { type: 'full-text' }))));

/**
 * Resolves a typename against the types registered for the space, so the filter uses the same type
 * identity the registry reports rather than a bare string.
 */
const resolveType = Effect.fnUntraced(function* (typename: string) {
  const types = yield* Database.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry())).run;
  const schema = types.find((type) => Type.getTypename(type) === typename);
  if (!schema) {
    return yield* Effect.fail(new Error(`Schema not found: ${typename}`));
  }
  return schema;
});
