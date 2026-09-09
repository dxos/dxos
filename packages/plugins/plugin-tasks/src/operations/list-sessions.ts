//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Query } from '@dxos/echo';
import { RemoteSession } from '@dxos/types';

import { RemoteSessionOperation } from '#types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const handler: Operation.WithHandler<typeof RemoteSessionOperation.ListSessions> =
  RemoteSessionOperation.ListSessions.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ state, sessionId, limit }) {
        // Selected by type and narrowed in memory: a props filter built from optional inputs is a
        // union of filter shapes, which erases the element type the output schema needs.
        const objects = yield* Database.query(Query.select(Filter.type(RemoteSession.RemoteSession))).run;

        // Newest first on `started` (ISO-8601, so lexical order is chronological), then paged.
        const sessions = objects
          .filter((session) => (state ? session.state === state : true))
          .filter((session) => (sessionId ? session.sessionId === sessionId : true))
          .sort((left, right) => (left.started < right.started ? 1 : left.started > right.started ? -1 : 0))
          .slice(0, Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT));

        return { sessions };
      }),
    ),
  );

export default handler;
