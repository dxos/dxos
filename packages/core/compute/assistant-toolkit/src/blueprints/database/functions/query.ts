//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Entity, Filter, Obj, Query as EchoQuery, Type } from '@dxos/echo';

import { Query } from './definitions';

// TODO(burdon): Move to toolkit (i.e., tool not function).
export default Query.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ in: parents, typename, text, includeContent = false, limit = 10, includeQueues = false }) {
      const { db } = yield* Database.Service;
      let query: EchoQuery.Any;
      if (text) {
        query = EchoQuery.all(
          ...text.split(' ').map((term) => EchoQuery.select(Filter.text(term, { type: 'full-text' }))),
        );
        if (typename !== undefined) {
          const { db } = yield* Database.Service;
          const schema = db.graph.registry.listTypes().find((t) => Type.getTypename(t) === typename);
          if (!schema) {
            return yield* Effect.fail(new Error(`Schema ${typename} not found`));
          }
          query = query.select(Filter.type(schema));
        }
      } else if (typename) {
        const { db } = yield* Database.Service;
        const schema = db.graph.registry.listTypes().find((t) => Type.getTypename(t) === typename);
        if (!schema) {
          return yield* Effect.fail(new Error(`Schema ${typename} not found`));
        }
        query = EchoQuery.select(Filter.type(schema));
      } else {
        query = EchoQuery.select(Filter.everything());
      }

      if (parents && parents.length > 0) {
        query = query.select(Filter.childOf(parents));
      }

      query = query.limit(limit);
      if (includeQueues) {
        // Must scope to the current space: `from({ allFeedsFromSpaces: true })` alone has no spaceIds, so the SQL
        // index returns nothing (see ObjectMetaIndex.buildSourceCondition / early returns when spaceIds are empty).
        query = query.from(db, { includeFeeds: true });
      }

      yield* Database.flush();
      const results = yield* Database.runQuery(query);
      if (includeContent) {
        return results.map((obj) => Entity.toJSON(obj));
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
