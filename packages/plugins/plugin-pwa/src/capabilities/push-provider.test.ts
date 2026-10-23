//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import type * as AppPush from '@dxos/app-toolkit/AppPush';

import {
  type PushManagerLike,
  type PushSubscriptionLike,
  type WorkerMessagesLike,
  makePushProvider,
} from './push-provider.ts';

/** Base64url of 65 bytes, the shape of a VAPID public key. */
const KEY_A = 'B'.repeat(87);
const KEY_B = 'C'.repeat(87);

const decode = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

class FakeSubscription implements PushSubscriptionLike {
  readonly options: { applicationServerKey: ArrayBuffer | null };
  unsubscribe = vi.fn(async () => true);

  constructor(
    readonly endpoint: string,
    applicationServerKey: Uint8Array,
  ) {
    this.options = { applicationServerKey: applicationServerKey.slice().buffer };
  }

  toJSON() {
    return { endpoint: this.endpoint, keys: { p256dh: 'p256dh', auth: 'auth' } };
  }
}

class FakePushManager implements PushManagerLike {
  current: FakeSubscription | null = null;
  subscribed = 0;

  getSubscription = async () => this.current;

  subscribe = vi.fn(async ({ applicationServerKey }: { applicationServerKey: Uint8Array<ArrayBuffer> }) => {
    this.current = new FakeSubscription(
      `https://fcm.googleapis.com/fcm/send/${++this.subscribed}`,
      applicationServerKey,
    );
    return this.current;
  });
}

class FakeWorkerMessages implements WorkerMessagesLike {
  readonly #listeners = new Set<(event: MessageEvent) => void>();

  addEventListener = (_type: 'message', listener: (event: MessageEvent) => void) => {
    this.#listeners.add(listener);
  };

  removeEventListener = (_type: 'message', listener: (event: MessageEvent) => void) => {
    this.#listeners.delete(listener);
  };

  /** Delivers `data` as the service worker would post it. */
  post(data: unknown) {
    const event = new MessageEvent('message', { data });
    this.#listeners.forEach((listener) => listener(event));
  }
}

type SetupOptions = { supported?: boolean; permission?: AppPush.Permission; answer?: AppPush.Permission };

const setup = ({ supported = true, permission = 'granted', answer = 'granted' }: SetupOptions = {}) => {
  const manager = new FakePushManager();
  const requestPermission = vi.fn(async () => answer);
  const messages = new FakeWorkerMessages();
  const provider = makePushProvider({
    supported,
    messages,
    pushManager: Promise.resolve(manager),
    permission: () => permission,
    requestPermission,
  });
  return { provider, manager, messages, requestPermission };
};

describe('makePushProvider', () => {
  test('subscribes with the key and hands back the endpoint and keys', async () => {
    const { provider, manager } = setup();

    const subscription = await provider.subscribe({ applicationServerKey: KEY_A });

    expect(subscription).toEqual({
      kind: 'webpush',
      endpoint: 'https://fcm.googleapis.com/fcm/send/1',
      keys: { p256dh: 'p256dh', auth: 'auth' },
    });
    expect(manager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: decode(KEY_A) });
    expect(await provider.current()).toEqual(subscription);
  });

  test('reuses a subscription made with the same key', async () => {
    const { provider, manager } = setup();
    await provider.subscribe({ applicationServerKey: KEY_A });

    await provider.subscribe({ applicationServerKey: KEY_A });

    expect(manager.subscribe).toHaveBeenCalledOnce();
  });

  test('replaces a subscription made with another key', async () => {
    const { provider, manager } = setup();
    await provider.subscribe({ applicationServerKey: KEY_A });
    const stale = manager.current;

    const subscription = await provider.subscribe({ applicationServerKey: KEY_B });

    expect(stale?.unsubscribe).toHaveBeenCalledOnce();
    expect(subscription.endpoint).toBe('https://fcm.googleapis.com/fcm/send/2');
  });

  test('asks only when the user has not answered', async () => {
    const asked = setup({ permission: 'default', answer: 'denied' });
    expect(await asked.provider.requestPermission()).toBe('denied');
    expect(asked.requestPermission).toHaveBeenCalledOnce();

    const answered = setup({ permission: 'denied' });
    expect(await answered.provider.requestPermission()).toBe('denied');
    expect(answered.requestPermission).not.toHaveBeenCalled();
  });

  test('unsubscribe drops the current subscription', async () => {
    const { provider, manager } = setup();
    await provider.subscribe({ applicationServerKey: KEY_A });
    const subscription = manager.current;

    await provider.unsubscribe();

    expect(subscription?.unsubscribe).toHaveBeenCalledOnce();
  });

  test('a worker that never activates fails instead of hanging', async () => {
    const provider = makePushProvider({
      supported: true,
      messages: undefined,
      pushManager: new Promise(() => {}),
      permission: () => 'granted',
      requestPermission: async () => 'granted',
      activationTimeout: '10 millis',
    });

    await expect(provider.subscribe({ applicationServerKey: KEY_A })).rejects.toThrow();
  });

  test('a push service that never answers fails instead of hanging', async () => {
    const manager = new FakePushManager();
    manager.subscribe.mockImplementation(() => new Promise<FakeSubscription>(() => {}));
    const provider = makePushProvider({
      supported: true,
      messages: undefined,
      pushManager: Promise.resolve(manager),
      permission: () => 'granted',
      requestPermission: async () => 'granted',
      serviceTimeout: '10 millis',
    });

    await expect(provider.subscribe({ applicationServerKey: KEY_A })).rejects.toThrow(/did not answer/);
  });

  test('a test push shown by the worker is confirmed, and one that never comes is not', async () => {
    const { provider, messages } = setup();

    const confirmed = provider.waitForTest('1 second');
    messages.post({ type: 'dxos:precache-progress' });
    messages.post({ type: 'dxos:push-test-shown' });
    expect(await confirmed).toBe(true);

    expect(await provider.waitForTest('10 millis')).toBe(false);
  });

  test('an unsupported device has no subscription and refuses to subscribe', async () => {
    const { provider } = setup({ supported: false });

    expect(provider.supported).toBe(false);
    expect(await provider.current()).toBeUndefined();
    expect(await provider.waitForTest('1 second')).toBe(false);
    await expect(provider.subscribe({ applicationServerKey: KEY_A })).rejects.toThrow();
  });
});
