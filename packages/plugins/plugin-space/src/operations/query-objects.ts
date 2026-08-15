//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity, Filter, Obj, Query, Scope, Type } from '@dxos/echo';

import { SpaceObjectOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceObjectOperation.QueryObjects> = SpaceObjectOperation.QueryObjects.pipe(
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

      let query: Query.Any;
      if (text) {
        query = Query.all(...text.split(' ').map((term) => Query.select(Filter.text(term, { type: 'full-text' }))));
        if (typename !== undefined) {
          query = query.select(Filter.type(yield* resolveType(typename)));
        }
      } else if (typename) {
        query = Query.select(Filter.type(yield* resolveType(typename)));
      } else {
        query = Query.select(Filter.everything());
      }

      if (parents && parents.length > 0) {
        query = query.select(Filter.childOf(parents));
      }

      query = query.limit(limit);
      if (includeQueues) {
        // Must scope to the current space: `from({ allFeedsFromSpaces: true })` alone has no spaceIds, so the
        // SQL index returns nothing (see EntityMetaIndex.buildSourceCondition).
        query = query.from(db, { includeFeeds: true });
      }

      yield* Database.flush();
      const results = yield* Database.query(query).run;
      return {
        results: results.map((object) =>
          includeContent
            ? Entity.toJSON(object)
            : { dxn: Obj.getURI(object), typename: Obj.getTypename(object), label: Obj.getLabel(object) },
        ),
      };
    }),
  ),
);

export default handler;

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
