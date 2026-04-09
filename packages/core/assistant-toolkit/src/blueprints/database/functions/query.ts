//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Entity, Filter, Obj, Query as EchoQuery } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Query } from './definitions';

// TODO(burdon): Move to toolkit (i.e., tool not function).
export default Query.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ typename, text, includeContent = false, limit = 10, includeQueues = false }) {
      const { db } = yield* Database.Service;
      let query: EchoQuery.Any;
      if (text) {
        query = EchoQuery.all(
          ...text.split(' ').map((term) => EchoQuery.select(Filter.text(term, { type: 'full-text' }))),
        );
        if (typename !== undefined) {
          const schema = yield* Database.runSchemaQuery({ typename, location: ['database', 'runtime'] });
          if (schema.length === 0) {
            return yield* Effect.fail(new Error(`Schema ${typename} not found`));
          }
          query = query.select(Filter.type(schema[0]));
        }
      } else if (typename) {
        const schema = yield* Database.runSchemaQuery({ typename, location: ['database', 'runtime'] });
        if (schema.length === 0) {
          return yield* Effect.fail(new Error(`Schema ${typename} not found`));
        }
        query = EchoQuery.select(Filter.type(schema[0]));
      } else {
        query = EchoQuery.select(Filter.everything());
      }
      query = query.limit(limit);
      if (includeQueues) {
        // Must scope to the current space: `from({ allQueuesFromSpaces: true })` alone has no spaceIds, so the SQL
        // index returns nothing (see ObjectMetaIndex.buildSourceCondition / early returns when spaceIds are empty).
        query = query.from(db, { includeFeeds: true });
      }

      yield* Database.flush();
      const results = yield* Database.runQuery(query);
      if (includeContent) {
        return results.map((obj) => Entity.toJSON(obj));
      } else {
        return results.map((obj) => ({
          dxn: Obj.getDXN(obj).toString(),
          typename: Obj.getTypename(obj),
          label: Obj.getLabel(obj),
        }));
      }
    }),
  ),
);
