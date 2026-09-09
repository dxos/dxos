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
        // Oldest id wins, and the rest are removed below. Nothing constrains uniqueness on
        // `sessionId`, so two hooks firing their first report at once both see no row and both
        // create one; converging deterministically keeps every later writer on one object.
        const matches = [
          ...(yield* Database.query(Query.select(Filter.type(RemoteSession.RemoteSession, { sessionId }))).run),
        ].sort((left, right) => left.id.localeCompare(right.id));
        const [existing, ...duplicates] = matches;

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

        // Duplicates carry history, not noise: each was found by some writer and took its own
        // updates, so one can hold the end of the session while the survivor still reads running.
        // Their content is folded in before they are removed, and the incoming patch is applied
        // after, so the newest report still wins where it says anything.
        Obj.update(existing, (existing) => {
          for (const duplicate of duplicates) {
            existing.title ??= duplicate.title;
            existing.repo ??= duplicate.repo;
            existing.branch ??= duplicate.branch;
            existing.worktree ??= duplicate.worktree;
            // Latest check-in wins for the prose and the heartbeat, since both describe a moment.
            if (duplicate.lastCheckedIn !== undefined && duplicate.lastCheckedIn > (existing.lastCheckedIn ?? '')) {
              existing.lastMessage = duplicate.lastMessage ?? existing.lastMessage;
              existing.lastCheckedIn = duplicate.lastCheckedIn;
            }
            // Earliest start, because the session began when the first of these rows says it did.
            if (duplicate.started < existing.started) {
              existing.started = duplicate.started;
            }
            // An end recorded anywhere is the end: a terminal state must survive the merge, or
            // deleting the row that carried it would leave a finished session reading running.
            if (RemoteSession.isTerminal(duplicate) && !RemoteSession.isTerminal(existing)) {
              existing.state = duplicate.state;
              existing.finished = duplicate.finished;
            }
          }
        });

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
          // A terminal session keeps its state. Reports keep arriving after one ends — a queued
          // hook, a resumed transcript — and letting `running` win would leave a finished session
          // looking live, contradicting the `finished` time it still carries.
          if (state !== undefined && !RemoteSession.isTerminal(existing)) {
            existing.state = state;
            // Stamped once, on the transition: a later report on an already-finished session is a
            // check-in, and must not move the time the work actually ended.
            if (state !== 'running' && existing.finished === undefined) {
              existing.finished = now;
            }
          }
          existing.lastCheckedIn = now;
        });

        // The duplicates this operation could not prevent do not survive the write that finds
        // them: leaving them would report one session twice and split its later updates.
        for (const duplicate of duplicates) {
          yield* Database.remove(duplicate);
        }
        yield* Database.flush();
        return { session: existing, created: false };
      }),
    ),
  );

export default handler;
