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

const makeRegistration = (
  scope: string,
  { active = true, subscription = null }: { active?: boolean; subscription?: PushSubscriptionLike | null } = {},
) => {
  const worker = new FakeWorker();
  const pushManager: PushManagerLike = {
    getSubscription: async () => subscription,
    subscribe: async () => makeSubscription(),
  };
  const registration: PushWorkerRegistrationLike = {
    scope,
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
    const { registration, worker } = makeRegistration(`${BASE}assets/`, { active: false });
    const container: ServiceWorkerContainerLike = {
      register: vi.fn(async () => registration),
      getRegistration: async () => undefined,
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

  test('drops a push subscription left on the offline worker', async () => {
    const legacySubscription = makeSubscription();
    const offline = makeRegistration(BASE, { subscription: legacySubscription });
    const push = makeRegistration(`${BASE}assets/`);
    const container: ServiceWorkerContainerLike = {
      register: async () => push.registration,
      getRegistration: async () => offline.registration,
    };

    await registerPushWorker(container, '/assets/push-worker.js', BASE);
    await vi.waitFor(() => expect(legacySubscription.unsubscribe).toHaveBeenCalledOnce());
  });

  test('a registration the browser refuses resolves undefined', async () => {
    const container: ServiceWorkerContainerLike = {
      register: async () => {
        throw new DOMException('Failed to register a ServiceWorker', 'SecurityError');
      },
      getRegistration: async () => undefined,
    };

    expect(await registerPushWorker(container, '/assets/push-worker.js', BASE)).toBeUndefined();
  });
});
