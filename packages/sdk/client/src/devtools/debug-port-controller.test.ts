//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { SESSION_TTL, getDebugPortController } from './debug-port-controller.ts';

const STORAGE_KEY = 'dxos:debug-port-session';

/**
 * A reload takes the port down with it, which strands an agent mid-investigation exactly when a
 * navigation-heavy flow (an OAuth redirect) makes the interesting state appear. `resume` carries an
 * already-authorized session across that reload — and must never manufacture one.
 */
describe('debug port session persistence', () => {
  const controller = getDebugPortController();

  // The controller reads `globalThis.sessionStorage`, which the node environment does not provide.
  const makeStorage = () => {
    const entries = new Map<string, string>();
    return {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, value),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
    };
  };

  let sessionStorage: ReturnType<typeof makeStorage>;

  beforeEach(() => {
    sessionStorage = makeStorage();
    Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorage, configurable: true });
  });

  afterEach(() => {
    controller.stop();
    Reflect.deleteProperty(globalThis, 'sessionStorage');
  });

  test('resume is a no-op when nothing was persisted', () => {
    expect(controller.resume()).toBeUndefined();
    expect(controller.getStatus().running).toBe(false);
  });

  test('resume is a no-op for a session started without persist', () => {
    controller.start();
    controller.stop();
    expect(controller.resume()).toBeUndefined();
  });

  test('a persisted session resumes under the same id', () => {
    const session = controller.start({ persist: true });
    // Simulate the reload: the loop is gone, but sessionStorage survives.
    controller.stop();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ session, expiresAt: Date.now() + SESSION_TTL }));

    expect(controller.resume()).toBe(session);
    expect(controller.getStatus().session).toBe(session);
  });

  test('an expired record does not resume, and is cleared', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ session: 'stale', expiresAt: Date.now() - 1 }));

    expect(controller.resume()).toBeUndefined();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('stopping clears the record, so a later reload does not revive the port', () => {
    controller.start({ persist: true });
    controller.stop();

    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(controller.resume()).toBeUndefined();
  });
});
