//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { shareInFlight } from './usePrivateChat.ts';

/** An open that resolves when the test says so. */
const deferredOpen = () => {
  let resolve: (chat: string) => void = () => {};
  const promise = new Promise<string>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('shareInFlight', () => {
  test('an open started while another for the same agent and member runs shares it', async ({ expect }) => {
    const inFlight = new Map<string, Promise<string>>();
    const pending = deferredOpen();
    let calls = 0;
    const open = () => {
      calls++;
      return pending.promise;
    };

    const first = shareInFlight(inFlight, 'kai alice', open);
    const second = shareInFlight(inFlight, 'kai alice', open);
    pending.resolve('chat-1');
    expect(await first).toBe('chat-1');
    expect(await second).toBe('chat-1');
    expect(calls).toBe(1);

    // Once it has settled, the next open runs again, so a failed open can be retried.
    expect(
      await shareInFlight(inFlight, 'kai alice', () => {
        calls++;
        return Promise.resolve('chat-1');
      }),
    ).toBe('chat-1');
    expect(calls).toBe(2);
    expect(inFlight.size).toBe(0);
  });

  test("another member's open runs on its own", async ({ expect }) => {
    const inFlight = new Map<string, Promise<string>>();
    const alice = deferredOpen();
    const bob = shareInFlight(inFlight, 'kai bob', () => Promise.resolve('chat-bob'));
    const aliceChat = shareInFlight(inFlight, 'kai alice', () => alice.promise);
    alice.resolve('chat-alice');
    expect(await bob).toBe('chat-bob');
    expect(await aliceChat).toBe('chat-alice');
  });
});
