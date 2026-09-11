//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Hypergraph, Obj, Query } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';
import { RemoteSession } from '@dxos/types';

import { RemoteSessionOperation } from '#types';

/**
 * What a caller is told when the session is not registered anywhere and named no space.
 *
 * Not an error: the hook's payload is fixed, so a first report legitimately cannot say where the
 * session belongs. The model reading this result is the one that can, and it is the only party in
 * the loop that knows which space the work is being tracked in.
 */
const NEEDS_SPACE = (sessionId: string) =>
  `This session (${sessionId}) is not recorded in any space, and no spaceId was given, so nothing ` +
  'was written. Re-run this operation with the `spaceId` of the space this work is tracked in — ' +
  'the project skill resolves it from the repo binding, and `whoami` lists the spaces available. ' +
  'Once recorded, later reports find the session on their own and need no spaceId.';

/**
 * Every row for this session, across every space the graph spans.
 *
 * Sorted by id so a tie converges: nothing constrains uniqueness, so two hooks firing their first
 * report at once both see no row and both create one. Oldest id wins and the rest are folded in
 * and removed below.
 */
const findAll = (graph: Hypergraph.Hypergraph, sessionId: string) =>
  Effect.promise(() =>
    graph
      .query(
        Query.select(Filter.foreignKeys(RemoteSession.RemoteSession, [RemoteSession.key(sessionId)])).from(
          'all-accessible-spaces',
        ),
      )
      .run(),
  ).pipe(Effect.map((result) => [...result].sort((left, right) => left.id.localeCompare(right.id))));

const handler: Operation.WithHandler<typeof RemoteSessionOperation.RecordSession> =
  RemoteSessionOperation.RecordSession.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ sessionId, spaceId, title, state, lastMessage, repo, branch, worktree }) {
        const { graph } = yield* Hypergraph.Service;
        const now = new Date().toISOString();

        // The graph spans every space, so the session is found wherever it was first registered —
        // which is the whole point: a hook cannot name a space, but it can be told where the
        // session already lives.
        const matches = yield* findAll(graph, sessionId);
        const [existing, ...duplicates] = matches;

        if (!existing) {
          // Nothing to update. Without a space there is nowhere to put it either, so report back
          // rather than guessing one — the outcome worse than not recording the session at all.
          if (!spaceId) {
            return { sessionId, created: false, instructions: NEEDS_SPACE(sessionId) };
          }
          if (!SpaceId.isValid(spaceId)) {
            return { sessionId, created: false, instructions: `Not a valid spaceId: ${spaceId}.` };
          }
          const db = graph.getDatabase(spaceId);
          if (!db) {
            return { sessionId, created: false, instructions: `No such space: ${spaceId}.` };
          }
          const session = db.add(
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
          yield* Effect.promise(() => db.flush());
          return { session, sessionId, created: true };
        }

        // Written back through the database that actually holds the survivor, which is not
        // necessarily the one the caller named.
        const db: Database.Database | undefined = Obj.getDatabase(existing);

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
          db?.remove(duplicate);
        }
        yield* Effect.promise(async () => db?.flush());
        return { session: existing, sessionId, created: false };
      }),
    ),
  );

export default handler;
