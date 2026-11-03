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
 * An agent's actor is the object it IS, so the delegate carries a `subject` ref to the session: a
 * bare `{ role: 'assistant' }` says an assistant owns the task but not WHICH run, and a session's
 * own check-in (`RecordSession`) lists its open tasks by matching that ref. The session supplies the
 * role and subject; the caller's other fields are kept only when it described an agent, since a
 * person's name or identity on the delegate would read as that person at work.
 *
 * `defaultTitle` (the claimed task's title) names a session the caller left untitled, so a run
 * that picks up work over MCP is listed by what it is doing rather than by a bare harness id.
 */
export const assignToSession: (
  session: SessionProps,
  delegate: Actor.Actor | undefined,
  options?: { defaultTitle?: string },
) => Effect.Effect<Actor.Actor, never, Database.Service> = Effect.fnUntraced(function* (
  { sessionId, ...sessionProps }: SessionProps,
  delegate: Actor.Actor | undefined,
  { defaultTitle }: { defaultTitle?: string } = {},
) {
  const title = sessionProps.title ?? defaultTitle;
  const props = title === undefined ? sessionProps : { ...sessionProps, title };
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

  return {
    ...(delegate?.role === 'assistant' ? delegate : {}),
    role: 'assistant' as const,
    subject: Ref.make(session),
  };
});
