//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import { Obj, Ref } from '@dxos/echo';

import * as Actor from './Actor';
import * as RemoteSession from './RemoteSession';
import * as Task from './Task';

describe('RemoteSession', () => {
  test('carries the harness session id as its foreign key', ({ expect }) => {
    const session = RemoteSession.make({
      sessionId: 'session_016eid',
      title: 'Land the release PR',
      state: 'running',
      started: new Date().toISOString(),
    });

    expect(session.sessionId).toBe('session_016eid');
    expect(Obj.getTypename(session)).toBe('org.dxos.type.remoteSession');
  });

  test('distinguishes terminal states from a session still working', ({ expect }) => {
    const started = new Date().toISOString();
    const running = RemoteSession.make({ sessionId: 'a', state: 'running', started });
    const finished = RemoteSession.make({ sessionId: 'b', state: 'finished', started });
    const failed = RemoteSession.make({ sessionId: 'c', state: 'failed', started });
    // A session whose host went away is not terminal: nothing reported it done, so a reader must
    // age it out by `lastCheckedIn` rather than treat it as closed.
    const unknown = RemoteSession.make({ sessionId: 'd', state: 'unknown', started });

    expect(RemoteSession.isTerminal(running)).toBe(false);
    expect(RemoteSession.isTerminal(finished)).toBe(true);
    expect(RemoteSession.isTerminal(failed)).toBe(true);
    expect(RemoteSession.isTerminal(unknown)).toBe(false);
  });

  test('is usable as a task assignee through the actor subject ref', ({ expect }) => {
    const session = RemoteSession.make({
      sessionId: 'session_worker',
      state: 'running',
      started: new Date().toISOString(),
    });
    const assignee: Actor.Actor = { name: 'Claude', subject: Ref.make(session) };
    const task = Task.make({ title: 'Fix the flake', assignee });

    expect(task.assignee?.subject?.target?.id).toBe(session.id);
  });
});
