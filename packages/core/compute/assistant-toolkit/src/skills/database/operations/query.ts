//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Query as EchoQuery, Entity, Filter, Obj } from '@dxos/echo';

import { Query } from './definitions';
import { expandRefs } from './expand-refs';
import { typenameFilter } from './type-filter';

// TODO(burdon): Move to toolkit (i.e., tool not function).
export default Query.pipe(
  Operation.withHandler(
    Effect.fn(function* ({
      in: parents,
      typename,
      text,
      includeContent = false,
      limit = 10,
      includeQueues = false,
      expandDepth = 0,
    }) {
      const { db } = yield* Database.Service;
      let query: EchoQuery.Any;
      if (text) {
        query = EchoQuery.all(
          ...text.split(' ').map((term) => EchoQuery.select(Filter.text(term, { type: 'full-text' }))),
        );
        if (typename !== undefined) {
          query = query.select(yield* typenameFilter(typename));
        }
      } else if (typename) {
        query = EchoQuery.select(yield* typenameFilter(typename));
      } else {
        query = EchoQuery.select(Filter.everything());
      }

      if (parents && parents.length > 0) {
        query = query.select(Filter.childOf(parents));
      }

      query = query.limit(limit);
      if (includeQueues) {
        // Must scope to the current space: `from({ allFeedsFromSpaces: true })` alone has no spaceIds, so the SQL
        // index returns nothing (see EntityMetaIndex.buildSourceCondition / early returns when spaceIds are empty).
        query = query.from(db, { includeFeeds: true });
      }

      yield* Database.flush();
      const results = yield* Database.query(query).run;
      if (includeContent) {
        return yield* Effect.forEach(results, (obj) => expandRefs(Entity.toJSON(obj), expandDepth));
      } else {
        return results.map((obj) => ({
          dxn: Obj.getURI(obj),
          typename: Obj.getTypename(obj),
          label: Obj.getLabel(obj),
        }));
      }
    }),
  ),
);
