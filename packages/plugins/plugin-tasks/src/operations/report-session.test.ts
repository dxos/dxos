//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Ref } from '@dxos/echo';
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

  it.effect('keys on sessionId, so two sessions stay distinct', () =>
    Effect.gen(function* () {
      yield* reportSession.handler({ sessionId: 'session_one', title: 'One' });
      yield* reportSession.handler({ sessionId: 'session_two', title: 'Two' });
      const { sessions } = yield* listSessions.handler({});
      expect(sessions.map((session) => session.sessionId).sort()).toEqual(['session_one', 'session_two']);
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
  it.effect('filters by state and by session id', () =>
    Effect.gen(function* () {
      yield* reportSession.handler({ sessionId: 'session_a' });
      yield* reportSession.handler({ sessionId: 'session_b', state: 'finished' });

      const running = yield* listSessions.handler({ state: 'running' });
      expect(running.sessions.map((session) => session.sessionId)).toEqual(['session_a']);

      const byId = yield* listSessions.handler({ sessionId: 'session_b' });
      expect(byId.sessions).toHaveLength(1);
      expect(byId.sessions[0]!.state).toBe('finished');
    }).pipe(Effect.provide(TestDatabaseLayer({ types }))),
  );
});
