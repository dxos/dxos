//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import { type PushManagerLike, type PushSubscriptionLike } from './push-provider.ts';
import { type PushWorkerRegistrationLike, type ServiceWorkerContainerLike, registerPushWorker } from './push-worker.ts';

class FakeWorker {
  state = 'installing';
  readonly #listeners: Array<() => void> = [];

  addEventListener = (_type: 'statechange', listener: () => void) => {
    this.#listeners.push(listener);
  };

  activate() {
    this.state = 'activated';
    this.#listeners.forEach((listener) => listener());
  }
}

const makeSubscription = (): PushSubscriptionLike => ({
  options: { applicationServerKey: null },
  toJSON: () => ({}),
  unsubscribe: vi.fn(async () => true),
});

const makeRegistration = ({ active = true }: { active?: boolean } = {}) => {
  const worker = new FakeWorker();
  const pushManager: PushManagerLike = {
    getSubscription: async () => null,
    subscribe: async () => makeSubscription(),
  };
  const registration: PushWorkerRegistrationLike = {
    active: active ? {} : null,
    installing: active ? null : worker,
    waiting: null,
    pushManager,
  };
  return { registration, worker };
};

const BASE = 'https://composer.space/';

describe('registerPushWorker', () => {
  test('registers at the script directory as a module and waits for the worker to activate', async () => {
    const { registration, worker } = makeRegistration({ active: false });
    const container: ServiceWorkerContainerLike = {
      register: vi.fn(async () => registration),
    };

    let settled = false;
    const registered = registerPushWorker(container, '/assets/push-worker-abc.js', BASE).then((result) => {
      settled = true;
      return result;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    worker.activate();
    expect(await registered).toBe(registration);
    expect(container.register).toHaveBeenCalledWith(`${BASE}assets/push-worker-abc.js`, {
      scope: '/assets/',
      type: 'module',
    });
  });

  test('a registration the browser refuses resolves undefined', async () => {
    const container: ServiceWorkerContainerLike = {
      register: async () => {
        throw new DOMException('Failed to register a ServiceWorker', 'SecurityError');
      },
    };

    expect(await registerPushWorker(container, '/assets/push-worker.js', BASE)).toBeUndefined();
  });
});
