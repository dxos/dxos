//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, expect, test, vi } from 'vitest';

import type * as AppUpdate from '@dxos/app-toolkit/AppUpdate';

import { type RegistrationLike, makeUpdateManager, progressStatus } from './update-manager.ts';

/** A service worker registration with just what `check` reads. */
class FakeRegistration implements RegistrationLike {
  installing: unknown = null;
  waiting: unknown = null;
  update = vi.fn(async () => {});
}

const setup = (registration: Promise<RegistrationLike | undefined>, { dev = false } = {}) => {
  const statuses: AppUpdate.Status[] = [];
  const container = new EventTarget();
  const skipWaiting = vi.fn(async () => {});
  const reload = vi.fn();
  const manager = makeUpdateManager({
    status: Atom.make<AppUpdate.Status>({ kind: 'idle' }),
    setStatus: (status) => statuses.push(status),
    supported: true,
    dev,
    registration,
    container,
    skipWaiting,
    reload,
  });
  return { manager, statuses, last: () => statuses.at(-1), container, skipWaiting, reload };
};

describe('makeUpdateManager', () => {
  test('under the dev server a check reports dev instead of waiting for a worker that never registers', async () => {
    // vite-plugin-pwa's dev stub never calls back, so the registration promise never settles.
    const { manager, last } = setup(new Promise(() => {}), { dev: true });

    await manager.check();

    expect(last()).toEqual({ kind: 'dev' });
  }, 500);

  test('a check before the worker registers waits for it rather than reporting unsupported', async () => {
    // vite-plugin-pwa registers only once the window `load` event fires, so a click before then has
    // no registration yet. That is "not yet", never "no update channel".
    let register!: (registration: RegistrationLike) => void;
    const { manager, last } = setup(new Promise((resolve) => (register = resolve)));

    const checking = manager.check();
    const registration = new FakeRegistration();
    register(registration);
    await checking;

    expect(registration.update).toHaveBeenCalledOnce();
    expect(last()).toMatchObject({ kind: 'up-to-date' });
  });

  test('a check while an install is already in flight does not start another', async () => {
    const registration = new FakeRegistration();
    const { manager } = setup(Promise.resolve(registration));
    registration.installing = {};

    await manager.check();

    expect(registration.update).not.toHaveBeenCalled();
  });

  test('apply reloads once the waiting worker takes control', async () => {
    // vite-plugin-pwa only reloads a tab that was controlled when it registered.
    const { manager, container, skipWaiting, reload } = setup(Promise.resolve(new FakeRegistration()));

    await manager.apply();
    expect(skipWaiting).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();

    container.dispatchEvent(new Event('controllerchange'));
    container.dispatchEvent(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe('progressStatus', () => {
  test('an update that finishes installing is ready, even after an earlier update was', () => {
    // workbox stops reporting after the first update a poll finds, so a second update in the same
    // session goes ready -> downloading and must get back to ready from the worker's own message.
    expect(progressStatus({ current: 25, total: 100, done: false })).toMatchObject({ kind: 'downloading' });
    expect(progressStatus({ current: 100, total: 100, done: true })).toEqual({ kind: 'ready' });
  });
});
