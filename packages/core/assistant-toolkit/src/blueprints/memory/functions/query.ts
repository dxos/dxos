//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Entity, Filter, Query } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Memory } from '../../../types/Memory';
import { QueryMemories } from './definitions';

export default QueryMemories.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ text, limit = 10 }) {
      let query: Query.Any;
      if (text) {
        query = Query.all(
          // TODO(dmaretskyi): We should move this to the query executor layer.
          ...text.split(' ').map((term) => Query.select(Filter.text(term, { type: 'full-text' }))),
        ).select(Filter.type(Memory));
      } else {
        query = Query.select(Filter.type(Memory));
      }
      query = query.limit(limit);

      yield* Database.flush();
      const results = yield* Database.runQuery(query);
      return results.map((obj) => Entity.toJSON(obj));
    }),
  ),
);
