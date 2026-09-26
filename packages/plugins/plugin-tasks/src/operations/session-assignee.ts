//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { type Actor, RemoteSession } from '@dxos/types';

type SessionProps = { sessionId: string; title?: string; repo?: string; branch?: string; worktree?: string };

/**
 * The actor for a coding-agent session, creating the session record when the space does not hold
 * one for that harness id yet.
 *
 * An agent's actor is the object it IS, so the assignee carries a `subject` ref to the session: a
 * bare `{ role: 'assistant' }` says an assistant owns the task but not WHICH run, and a session's
 * own check-in (`RecordSession`) lists its open tasks by matching that ref. Any fields the caller
 * passed in `assignee` are kept — the session decides the subject, not the rest of the actor.
 */
export const assignToSession: (
  session: SessionProps,
  assignee: Actor.Actor | undefined,
) => Effect.Effect<Actor.Actor, never, Database.Service> = Effect.fnUntraced(function* (
  { sessionId, ...props }: SessionProps,
  assignee: Actor.Actor | undefined,
) {
  const { db } = yield* Database.Service;
  const matches = yield* Database.query(Filter.foreignKeys(RemoteSession.RemoteSession, [RemoteSession.key(sessionId)]))
    .run;
  // Oldest id wins, as `RecordSession` resolves a tie: nothing enforces uniqueness, so two writers
  // racing a first report can both create a row.
  const [existing] = [...matches].sort((left, right) => left.id.localeCompare(right.id));
  const session =
    existing ??
    db.add(
      RemoteSession.make({
        sessionId,
        state: 'running',
        started: new Date().toISOString(),
        lastCheckedIn: new Date().toISOString(),
        ...props,
      }),
    );

  // Fields the caller named are filled in on a session that lacks them; an existing value stands,
  // since the session itself reports its own state and this call is not that report.
  Obj.update(session, (session) => {
    session.title ??= props.title;
    session.repo ??= props.repo;
    session.branch ??= props.branch;
    session.worktree ??= props.worktree;
  });

  return { role: 'assistant' as const, ...assignee, subject: Ref.make(session) };
});
