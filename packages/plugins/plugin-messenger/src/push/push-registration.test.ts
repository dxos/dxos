//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import type * as AppPush from '@dxos/app-toolkit/AppPush';
import { EdgeCallFailedError } from '@dxos/protocols';

import { type PushEdge, makePushRegistration } from './push-registration.ts';

const PUBLIC_KEY = 'B'.repeat(87);

const SUBSCRIPTION: AppPush.WebPushSubscription = {
  kind: 'webpush',
  endpoint: 'https://fcm.googleapis.com/fcm/send/1',
  keys: { p256dh: 'p256dh', auth: 'auth' },
};

type FakeProviderOptions = {
  supported?: boolean;
  permission?: AppPush.Permission;
  answer?: AppPush.Permission;
  testShown?: boolean;
};

const makeProvider = ({
  supported = true,
  permission = 'default',
  answer = 'granted',
  testShown = true,
}: FakeProviderOptions = {}) => {
  let current: AppPush.DeviceSubscription | undefined;
  let state = permission;
  return {
    supported,
    permission: () => state,
    requestPermission: vi.fn(async () => {
      state = state === 'default' ? answer : state;
      return state;
    }),
    subscribe: vi.fn(async () => {
      current = SUBSCRIPTION;
      return SUBSCRIPTION;
    }),
    current: async () => current,
    unsubscribe: vi.fn(async () => {
      current = undefined;
    }),
    waitForTest: vi.fn(async () => testShown),
  } satisfies AppPush.Provider;
};

const makeEdge = ({ configured = true } = {}) =>
  ({
    getVapidPublicKey: vi.fn(async () => {
      if (!configured) {
        throw new EdgeCallFailedError({ message: 'Push is not configured.', status: 404 });
      }
      return { publicKey: PUBLIC_KEY };
    }),
    putPushSubscription: vi.fn(async () => {}),
    deletePushSubscription: vi.fn(async () => {}),
  }) satisfies PushEdge;

const setup = (providerOptions?: FakeProviderOptions, edgeOptions?: { configured?: boolean }) => {
  const provider = makeProvider(providerOptions);
  const edge = makeEdge(edgeOptions);
  const statuses: AppPush.Status[] = [];
  const enabled: boolean[] = [];
  const registration = makePushRegistration({
    provider: () => provider,
    edge,
    setStatus: (status) => statuses.push(status),
    setEnabled: (next) => enabled.push(next),
  });
  return { provider, edge, registration, statuses, enabled };
};

describe('makePushRegistration', () => {
  test('enable asks first, then subscribes with the VAPID key and registers without sending a test', async () => {
    const { provider, edge, registration } = setup();

    expect(await registration.enable()).toBe('on');

    expect(provider.requestPermission.mock.invocationCallOrder[0]).toBeLessThan(
      edge.getVapidPublicKey.mock.invocationCallOrder[0],
    );
    expect(provider.subscribe).toHaveBeenCalledWith({ applicationServerKey: PUBLIC_KEY });
    expect(edge.putPushSubscription).toHaveBeenCalledWith({
      endpoint: SUBSCRIPTION.endpoint,
      keys: SUBSCRIPTION.keys,
      test: false,
    });
    expect(provider.waitForTest).not.toHaveBeenCalled();
  });

  test('the choice is saved once permission is granted, before registering', async () => {
    const { edge, registration, enabled } = setup();
    let savedBeforeRegistering: boolean | undefined;
    edge.putPushSubscription.mockImplementationOnce(async () => {
      savedBeforeRegistering = enabled.at(-1);
    });

    await registration.enable();
    expect(savedBeforeRegistering).toBe(true);
  });

  test('a refused or dismissed prompt registers nothing and saves the device as off', async () => {
    const refused = setup({ answer: 'denied' });
    expect(await refused.registration.enable()).toBe('denied');
    expect(refused.edge.putPushSubscription).not.toHaveBeenCalled();
    expect(refused.enabled).toEqual([false]);

    const dismissed = setup({ answer: 'default' });
    expect(await dismissed.registration.enable()).toBe('off');
    expect(dismissed.provider.subscribe).not.toHaveBeenCalled();
  });

  test('a failed attempt keeps the choice, so the next start retries', async () => {
    const { edge, registration, enabled } = setup();
    edge.putPushSubscription.mockRejectedValueOnce(new Error('offline'));

    expect(await registration.enable()).toBe('failed');
    expect(enabled).toEqual([true]);
  });

  test('EDGE without push configured reads as unsupported', async () => {
    const { registration, provider } = setup({}, { configured: false });
    expect(await registration.enable()).toBe('unsupported');
    expect(provider.subscribe).not.toHaveBeenCalled();
  });

  test('a device without a provider is unsupported', async () => {
    const registration = makePushRegistration({
      provider: () => undefined,
      edge: makeEdge(),
      setStatus: () => {},
      setEnabled: () => {},
    });
    expect(await registration.enable()).toBe('unsupported');
    expect(await registration.refresh()).toBe('unsupported');
    expect(await registration.sendTest()).toBe('failed');
  });

  test('enable reads pending while it works, and a failure carries the browser error', async () => {
    const provider = makeProvider();
    provider.subscribe.mockRejectedValueOnce(
      new DOMException('Registration failed - push service error', 'AbortError'),
    );
    const updates: Array<[AppPush.Status, string | undefined]> = [];
    const registration = makePushRegistration({
      provider: () => provider,
      edge: makeEdge(),
      setStatus: (status, error) => updates.push([status, error]),
      setEnabled: () => {},
    });

    expect(await registration.enable()).toBe('failed');
    expect(updates).toEqual([
      ['pending', undefined],
      ['failed', 'AbortError: Registration failed - push service error'],
    ]);
  });

  test('a provider contributed after registration was created is used', async () => {
    let provider: AppPush.Provider | undefined;
    const registration = makePushRegistration({
      provider: () => provider,
      edge: makeEdge(),
      setStatus: () => {},
      setEnabled: () => {},
    });
    expect(await registration.enable()).toBe('unsupported');

    provider = makeProvider();
    expect(await registration.enable()).toBe('on');
  });

  test('a test asks EDGE for a test push, listening first, and reports whether it was shown', async () => {
    const shown = setup({ permission: 'granted' });
    expect(await shown.registration.sendTest()).toBe('shown');
    expect(shown.edge.putPushSubscription).toHaveBeenCalledWith(expect.objectContaining({ test: true }));
    expect(shown.provider.waitForTest.mock.invocationCallOrder[0]).toBeLessThan(
      shown.edge.putPushSubscription.mock.invocationCallOrder[0],
    );

    const missed = setup({ permission: 'granted', testShown: false });
    expect(await missed.registration.sendTest()).toBe('not-shown');
  });

  test('a test never prompts', async () => {
    const { provider, registration } = setup({ permission: 'default' });
    expect(await registration.sendTest()).toBe('failed');
    expect(provider.requestPermission).not.toHaveBeenCalled();
  });

  test('disable unregisters from EDGE, saves the device as off and keeps the browser subscription', async () => {
    const { provider, edge, registration, enabled } = setup();
    await registration.enable();

    expect(await registration.disable()).toBe('off');

    expect(edge.deletePushSubscription).toHaveBeenCalledWith(SUBSCRIPTION.endpoint);
    expect(provider.unsubscribe).not.toHaveBeenCalled();
    expect(enabled.at(-1)).toBe(false);
  });

  test('disable unsubscribes the browser when EDGE cannot be told', async () => {
    const { provider, edge, registration } = setup();
    await registration.enable();
    edge.deletePushSubscription.mockRejectedValueOnce(new Error('offline'));

    expect(await registration.disable()).toBe('off');
    expect(provider.unsubscribe).toHaveBeenCalledOnce();
  });

  test('a subscription the push service has dropped is replaced once', async () => {
    const { provider, edge, registration } = setup({ permission: 'granted' });
    edge.putPushSubscription.mockRejectedValueOnce(
      new EdgeCallFailedError({ message: 'The push service no longer knows this subscription.', status: 410 }),
    );

    expect(await registration.sendTest()).toBe('shown');

    expect(provider.unsubscribe).toHaveBeenCalledOnce();
    expect(provider.subscribe).toHaveBeenCalledTimes(2);
    expect(edge.putPushSubscription).toHaveBeenCalledTimes(2);
  });

  test('refresh re-registers without prompting when permission was granted', async () => {
    const { provider, edge, registration } = setup({ permission: 'granted' });

    expect(await registration.refresh()).toBe('on');

    expect(provider.requestPermission).not.toHaveBeenCalled();
    expect(provider.waitForTest).not.toHaveBeenCalled();
    expect(edge.putPushSubscription).toHaveBeenCalledWith(expect.objectContaining({ test: false }));
  });

  test('refresh never prompts when the user has not answered', async () => {
    const { provider, registration } = setup({ permission: 'default' });
    expect(await registration.refresh()).toBe('off');
    expect(provider.requestPermission).not.toHaveBeenCalled();
  });

  test('a failing EDGE call settles as failed rather than throwing', async () => {
    const { edge, registration, statuses } = setup();
    edge.putPushSubscription.mockRejectedValueOnce(new Error('offline'));

    expect(await registration.enable()).toBe('failed');
    expect(statuses.at(-1)).toBe('failed');
  });
});
