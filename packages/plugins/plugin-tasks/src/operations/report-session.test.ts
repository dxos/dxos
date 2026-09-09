//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { RemoteSession, Task, TaskSet } from '@dxos/types';

import listSessions from './list-sessions';
import reportSession from './report-session';

const types = [RemoteSession.RemoteSession, Task.Task, TaskSet.TaskSet];

describe('report-session', () => {
  it.effect('creates on first report and updates thereafter', () =>
    Effect.gen(function* () {
      const first = yield* reportSession.handler({
        sessionId: 'session_abc',
        title: 'Land the PR',
        branch: 'claude/x',
      });
      expect(first.created).toBe(true);
      expect(first.session.state).toBe('running');
      expect(first.session.started).toBeDefined();
      expect(first.session.lastCheckedIn).toBeDefined();

      const second = yield* reportSession.handler({ sessionId: 'session_abc', lastMessage: 'Tests pass.' });
      expect(second.created).toBe(false);
      expect(second.session.id).toBe(first.session.id);
      expect(second.sessionId).toBe('session_abc');
      expect(second.session.lastMessage).toBe('Tests pass.');
      // Unsupplied fields survive: each hook reports only what its event knows.
      expect(second.session.title).toBe('Land the PR');
      expect(second.session.branch).toBe('claude/x');
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );

  it.effect('stamps finished once, on the transition', () =>
    Effect.gen(function* () {
      yield* reportSession.handler({ sessionId: 'session_fin' });
      const closed = yield* reportSession.handler({ sessionId: 'session_fin', state: 'finished' });
      expect(closed.session.state).toBe('finished');
      const finished = closed.session.finished;
      expect(finished).toBeDefined();

      const later = yield* reportSession.handler({ sessionId: 'session_fin', lastMessage: 'still here' });
      expect(later.session.finished).toBe(finished);
      expect(later.session.state).toBe('finished');
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );

  it.effect('a session created terminal carries a finished time', () =>
    Effect.gen(function* () {
      const { session } = yield* reportSession.handler({ sessionId: 'session_failed', state: 'failed' });
      expect(session.state).toBe('failed');
      expect(session.finished).toBeDefined();
      expect(RemoteSession.isTerminal(session)).toBe(true);
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );

  it.effect('a terminal session is not resurrected by a later running report', () =>
    Effect.gen(function* () {
      yield* reportSession.handler({ sessionId: 'session_term', state: 'finished' });
      const later = yield* reportSession.handler({
        sessionId: 'session_term',
        state: 'running',
        lastMessage: 'a queued hook arriving after the end',
      });

      expect(later.session.state).toBe('finished');
      expect(later.session.finished).toBeDefined();
      // The report is still a check-in: what it carries besides `state` lands.
      expect(later.session.lastMessage).toBe('a queued hook arriving after the end');
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );

  it.effect('collapses duplicate rows for one sessionId onto the oldest', () =>
    Effect.gen(function* () {
      // The race the operation cannot prevent, staged directly: two rows, one sessionId.
      const first = yield* Database.add(
        RemoteSession.make({ sessionId: 'session_dup', state: 'running', started: new Date().toISOString() }),
      );
      const second = yield* Database.add(
        RemoteSession.make({ sessionId: 'session_dup', state: 'running', started: new Date().toISOString() }),
      );
      yield* Database.flush();
      const [oldest] = [first, second].sort((left, right) => left.id.localeCompare(right.id));

      const reported = yield* reportSession.handler({ sessionId: 'session_dup', title: 'Survivor' });
      expect(reported.session.id).toBe(oldest.id);

      const { sessions } = yield* listSessions.handler({ sessionId: 'session_dup' });
      expect(sessions).toHaveLength(1);
      expect(sessions[0]!.session.title).toBe('Survivor');
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );

  it.effect('a duplicate carrying the end of the session is merged, not dropped', () =>
    Effect.gen(function* () {
      const earlier = new Date(Date.now() - 60_000).toISOString();
      // The survivor is the oldest row and still reads running; the duplicate holds the end.
      const survivor = yield* Database.add(
        RemoteSession.make({
          sessionId: 'session_merge',
          state: 'running',
          started: earlier,
          lastCheckedIn: earlier,
          title: 'Long run',
        }),
      );
      const closed = yield* Database.add(
        RemoteSession.make({
          sessionId: 'session_merge',
          state: 'finished',
          started: new Date().toISOString(),
          lastCheckedIn: new Date().toISOString(),
          finished: new Date().toISOString(),
          lastMessage: 'Work completed.',
          branch: 'claude/from-the-duplicate',
        }),
      );
      yield* Database.flush();
      const [oldest] = [survivor, closed].sort((left, right) => left.id.localeCompare(right.id));

      // A bare heartbeat: it says nothing about state, so nothing but the merge can save the end.
      const reported = yield* reportSession.handler({ sessionId: 'session_merge' });

      expect(reported.session.id).toBe(oldest.id);
      expect(reported.session.state).toBe('finished');
      expect(reported.session.finished).toBeDefined();
      expect(reported.session.lastMessage).toBe('Work completed.');
      expect(reported.session.branch).toBe('claude/from-the-duplicate');
      expect(reported.session.title).toBe('Long run');
      // The session began when the earliest row says it did.
      expect(reported.session.started).toBe(earlier);

      const { sessions } = yield* listSessions.handler({ sessionId: 'session_merge' });
      expect(sessions).toHaveLength(1);
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );

  it.effect('keys on sessionId, so two sessions stay distinct', () =>
    Effect.gen(function* () {
      yield* reportSession.handler({ sessionId: 'session_one', title: 'One' });
      yield* reportSession.handler({ sessionId: 'session_two', title: 'Two' });
      const { sessions } = yield* listSessions.handler({});
      expect(sessions.map((row) => row.sessionId).sort()).toEqual(['session_one', 'session_two']);
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );

  it.effect('is assignable to a task through the actor subject ref', () =>
    Effect.gen(function* () {
      const { session } = yield* reportSession.handler({ sessionId: 'session_assign', title: 'Worker' });
      const task = Task.make({ title: 'Fix the flake', assignee: { name: 'Worker', subject: Ref.make(session) } });
      expect(task.assignee?.subject?.target?.id).toBe(session.id);
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );
});

describe('list-sessions', () => {
  it.effect('bounds a negative or fractional limit instead of slicing from the end', () =>
    Effect.gen(function* () {
      for (const index of [0, 1, 2]) {
        yield* reportSession.handler({ sessionId: `session_limit_${index}` });
      }

      // `slice(0, -1)` would drop only the last row, returning more than any cap allows.
      const negative = yield* listSessions.handler({ limit: -1 });
      expect(negative.sessions).toHaveLength(0);

      const fractional = yield* listSessions.handler({ limit: 1.9 });
      expect(fractional.sessions).toHaveLength(1);
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );

  it.effect('filters by state and by session id', () =>
    Effect.gen(function* () {
      yield* reportSession.handler({ sessionId: 'session_a' });
      yield* reportSession.handler({ sessionId: 'session_b', state: 'finished' });

      const running = yield* listSessions.handler({ state: 'running' });
      expect(running.sessions.map((row) => row.sessionId)).toEqual(['session_a']);

      const byId = yield* listSessions.handler({ sessionId: 'session_b' });
      expect(byId.sessions).toHaveLength(1);
      expect(byId.sessions[0]!.session.state).toBe('finished');
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );
});
