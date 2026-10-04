//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Events from '../workspace/Events.ts';
import * as Fold from '../workspace/Fold.ts';
import * as Pending from './pending.ts';

/** Drives the browser's busy derivation exactly as `openSession` does, one log entry at a time. */
const session = () => {
  let state = Fold.empty;
  let pending = Pending.none;
  let seq = 0;
  return {
    send: (turnId: string) => {
      pending = Pending.add(pending, turnId);
    },
    receive: (event: Events.Event) => {
      const entry: Events.Entry = { projectId: 'project', seq: ++seq, event };
      state = Fold.apply(state, entry);
      pending = Pending.settle(pending, entry);
    },
    busy: () => Pending.isBusy(state, pending),
  };
};

describe('busy state', () => {
  test('a second turn after a completed one stays busy until its own end event', ({ expect }) => {
    const client = session();
    client.send('first');
    client.receive(new Events.UserMessage({ text: 'one', turnId: 'first' }));
    client.receive(new Events.AssistantMessage({ text: 'done' }));
    client.receive(new Events.TurnEnded({ steps: 1, turnId: 'first' }));
    expect(client.busy()).toBe(false);

    client.send('second');
    expect(client.busy()).toBe(true);
    client.receive(new Events.UserMessage({ text: 'two', turnId: 'second' }));
    expect(client.busy()).toBe(true);
    // A late end event for the earlier turn must not close the one now running.
    client.receive(new Events.TurnEnded({ steps: 1, turnId: 'first' }));
    expect(client.busy()).toBe(true);
    client.receive(new Events.ToolCall({ callId: 'call', code: 'return 1;' }));
    expect(client.busy()).toBe(true);
    client.receive(new Events.TurnEnded({ steps: 2, turnId: 'second' }));
    expect(client.busy()).toBe(false);
  });

  test("the previous turn's events replayed after a send do not stand in for the new turn's echo", ({ expect }) => {
    // The send can beat the history down the stream (a reload, a project switch); the replayed
    // message and end event belong to the old turn, so the prompt is still waiting.
    const client = session();
    client.send('next');
    client.receive(new Events.UserMessage({ text: 'old', turnId: 'old' }));
    expect(client.busy()).toBe(true);
    client.receive(new Events.TurnEnded({ steps: 1, turnId: 'old' }));
    expect(client.busy()).toBe(true);
    client.receive(new Events.UserMessage({ text: 'new', turnId: 'next' }));
    client.receive(new Events.TurnEnded({ steps: 1, turnId: 'next' }));
    expect(client.busy()).toBe(false);
  });

  test('a turn that fails before recording its message still clears the wait', ({ expect }) => {
    const client = session();
    client.send('doomed');
    client.receive(new Events.TurnFailed({ message: 'Cannot record turn', turnId: 'doomed' }));
    expect(client.busy()).toBe(false);
  });

  test('a refused dispatch clears only its own wait', ({ expect }) => {
    let pending = Pending.add(Pending.add(Pending.none, 'kept'), 'refused');
    pending = Pending.remove(pending, 'refused');
    expect([...pending]).toEqual(['kept']);
  });

  test('a log written before turn ids existed still opens and closes turns', ({ expect }) => {
    const client = session();
    client.receive(new Events.UserMessage({ text: 'legacy' }));
    expect(client.busy()).toBe(true);
    client.receive(new Events.TurnEnded({ steps: 1 }));
    expect(client.busy()).toBe(false);
  });
});
