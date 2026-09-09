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

/**
 * Clamped to a whole number in [0, MAX_LIMIT]. `slice` reads a negative end as an offset from the
 * end, so an unchecked `limit: -1` from a remote caller returns every session but the last — more
 * rows than the cap, out of the argument meant to bound them.
 */
const pageSize = (limit: number | undefined): number =>
  limit === undefined ? DEFAULT_LIMIT : Math.min(Math.max(Math.floor(limit), 0), MAX_LIMIT);

const handler: Operation.WithHandler<typeof RemoteSessionOperation.ListSessions> =
  RemoteSessionOperation.ListSessions.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ state, sessionId, limit }) {
        // A lookup by id is pushed into the query — that is the one case where the whole result set
        // is not wanted and the filter shape stays constant. The optional `state` narrows in memory
        // instead: built from optional inputs the filter becomes a union of shapes, which erases the
        // element type the output schema needs.
        const objects = yield* Database.query(
          Query.select(
            sessionId
              ? Filter.type(RemoteSession.RemoteSession, { sessionId })
              : Filter.type(RemoteSession.RemoteSession),
          ),
        ).run;

        // Newest first on `started` (ISO-8601, so lexical order is chronological), then paged.
        const sessions = objects
          .filter((session) => (state ? session.state === state : true))
          .sort((left, right) => (left.started < right.started ? 1 : left.started > right.started ? -1 : 0))
          .slice(0, pageSize(limit));

        return { sessions };
      }),
    ),
  );

export default handler;
