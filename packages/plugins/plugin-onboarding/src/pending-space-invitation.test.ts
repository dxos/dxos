//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test, vi } from 'vitest';

import {
  PENDING_SPACE_INVITATION_KEY,
  PendingSpaceInvitation,
  type PendingSpaceInvitationStorage,
} from './pending-space-invitation.ts';

describe('PendingSpaceInvitation', () => {
  test('a held invitation is claimed once, whichever holder takes it', async ({ expect }) => {
    const storage = createMemoryStorage();
    new PendingSpaceInvitation(storage).stash('space-code');

    expect(await new PendingSpaceInvitation(storage).take()).toBe('space-code');
    expect(await new PendingSpaceInvitation(storage).take()).toBeUndefined();
  });

  test('an invitation held past a day is dropped', async ({ expect }) => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const pending = new PendingSpaceInvitation(createMemoryStorage());
    pending.stash('space-code');
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);

    expect(await pending.take()).toBeUndefined();
  });

  test('an entry that is not a held invitation is ignored', async ({ expect }) => {
    const storage = createMemoryStorage();
    storage.setItem(PENDING_SPACE_INVITATION_KEY, JSON.stringify({ code: 123, storedAt: Date.now() }));

    expect(await new PendingSpaceInvitation(storage).take()).toBeUndefined();
  });

  test('a holder that is no longer eligible once the lock is granted leaves the invitation held', async ({
    expect,
  }) => {
    const storage = createMemoryStorage();
    new PendingSpaceInvitation(storage).stash('space-code');

    let grant = () => {};
    vi.stubGlobal('navigator', {
      locks: {
        request: (_name: string, callback: () => unknown) =>
          new Promise((resolve) => {
            grant = () => resolve(callback());
          }),
      },
    });
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    let eligible = true;
    const claim = new PendingSpaceInvitation(storage).take(() => eligible);
    eligible = false;
    grant();

    expect(await claim).toBeUndefined();
    vi.unstubAllGlobals();
    expect(await new PendingSpaceInvitation(storage).take()).toBe('space-code');
  });

  test('a lock that cannot be taken claims nothing', async ({ expect }) => {
    vi.stubGlobal('navigator', { locks: { request: () => Promise.reject(new Error('SecurityError')) } });
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    const pending = new PendingSpaceInvitation(createMemoryStorage());
    pending.stash('space-code');

    await expect(pending.take()).resolves.toBeUndefined();
  });
});

const createMemoryStorage = (): PendingSpaceInvitationStorage => {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
};
