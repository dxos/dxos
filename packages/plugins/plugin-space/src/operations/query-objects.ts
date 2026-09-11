//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Filter, Obj, Query, Scope, Type } from '@dxos/echo';

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
          typeFilter(typename).pipe(Effect.map((filter) => fullText(text).select(filter))),
        ),
        Match.when({ text: present }, ({ text }) => Effect.succeed(fullText(text))),
        Match.when({ typename: present }, ({ typename }) =>
          typeFilter(typename).pipe(Effect.map((filter) => Query.select(filter))),
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
 * The filter for a caller-supplied typename: a bare-typename DXN, which is what `Filter.type`
 * documents for this case.
 *
 * Resolving the typename to a registered `Type` entity first and filtering on THAT pinned the
 * filter to one registration — a versioned `dxn:` for a static declaration, an `echo:` id for a
 * copy persisted in the space — so objects of the same typename written under any other
 * registration did not match, and which registration was picked depended on the order the registry
 * query happened to return. That is the under-return: a space holding both forms answered the same
 * call with all of its objects, some of them, or none, run to run.
 *
 * The registry is still consulted, but only to reject a typename nothing declares; it no longer
 * decides what the filter matches.
 */
const typeFilter = Effect.fnUntraced(function* (typename: string) {
  const types = yield* Database.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry())).run;
  if (!types.some((type) => Type.getTypename(type) === typename)) {
    return yield* Effect.fail(new Error(`Schema not found: ${typename}`));
  }
  return Filter.type(DXN.make(typename));
});
