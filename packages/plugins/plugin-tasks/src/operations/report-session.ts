//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { RemoteSession } from '@dxos/types';

import { RemoteSessionOperation } from '#types';

const handler: Operation.WithHandler<typeof RemoteSessionOperation.RecordSession> =
  RemoteSessionOperation.RecordSession.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ sessionId, title, state, lastMessage, repo, branch, worktree }) {
        const now = new Date().toISOString();
        const existing = (yield* Database.query(Query.select(Filter.type(RemoteSession.RemoteSession, { sessionId })))
          .run).at(0);

        if (!existing) {
          const session = yield* Database.add(
            RemoteSession.make({
              sessionId,
              title,
              state: state ?? 'running',
              lastMessage,
              started: now,
              lastCheckedIn: now,
              ...(state && state !== 'running' ? { finished: now } : {}),
              repo,
              branch,
              worktree,
            }),
          );
          yield* Database.flush();
          return { session, created: true };
        }

        // Every field is patched only when supplied: a hook bound to one event reports the two or
        // three things that event knows, and must not blank what another event wrote.
        Obj.update(existing, (existing) => {
          if (title !== undefined) {
            existing.title = title;
          }
          if (lastMessage !== undefined) {
            existing.lastMessage = lastMessage;
          }
          if (repo !== undefined) {
            existing.repo = repo;
          }
          if (branch !== undefined) {
            existing.branch = branch;
          }
          if (worktree !== undefined) {
            existing.worktree = worktree;
          }
          if (state !== undefined) {
            existing.state = state;
            // Stamped once, on the transition: a later report on an already-finished session is a
            // check-in, and must not move the time the work actually ended.
            if (state !== 'running' && existing.finished === undefined) {
              existing.finished = now;
            }
          }
          existing.lastCheckedIn = now;
        });
        yield* Database.flush();
        return { session: existing, created: false };
      }),
    ),
  );

export default handler;
