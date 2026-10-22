//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import type * as AppPush from '@dxos/app-toolkit/AppPush';
import { EdgeCallFailedError } from '@dxos/protocols';

import { type PushEdge, type PushStatus, makePushRegistration } from './push-registration.ts';

const PUBLIC_KEY = 'B'.repeat(87);

const SUBSCRIPTION: AppPush.WebPushSubscription = {
  kind: 'webpush',
  endpoint: 'https://fcm.googleapis.com/fcm/send/1',
  keys: { p256dh: 'p256dh', auth: 'auth' },
};

type FakeProviderOptions = { supported?: boolean; permission?: AppPush.Permission; answer?: AppPush.Permission };

const makeProvider = ({ supported = true, permission = 'default', answer = 'granted' }: FakeProviderOptions = {}) => {
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
  const statuses: PushStatus[] = [];
  const registration = makePushRegistration({
    provider: () => provider,
    edge,
    setStatus: (status) => statuses.push(status),
  });
  return { provider, edge, registration, statuses };
};

describe('makePushRegistration', () => {
  test('enable asks first, then subscribes with the VAPID key and registers the subscription', async () => {
    const { provider, edge, registration } = setup();

    expect(await registration.enable()).toBe('on');

    expect(provider.requestPermission.mock.invocationCallOrder[0]).toBeLessThan(
      edge.getVapidPublicKey.mock.invocationCallOrder[0],
    );
    expect(provider.subscribe).toHaveBeenCalledWith({ applicationServerKey: PUBLIC_KEY });
    expect(edge.putPushSubscription).toHaveBeenCalledWith({
      endpoint: SUBSCRIPTION.endpoint,
      keys: SUBSCRIPTION.keys,
      welcome: true,
    });
  });

  test('a refused or dismissed prompt registers nothing', async () => {
    const refused = setup({ answer: 'denied' });
    expect(await refused.registration.enable()).toBe('denied');
    expect(refused.edge.putPushSubscription).not.toHaveBeenCalled();

    const dismissed = setup({ answer: 'default' });
    expect(await dismissed.registration.enable()).toBe('off');
    expect(dismissed.provider.subscribe).not.toHaveBeenCalled();
  });

  test('EDGE without push configured reads as unsupported', async () => {
    const { registration, provider } = setup({}, { configured: false });
    expect(await registration.enable()).toBe('unsupported');
    expect(provider.subscribe).not.toHaveBeenCalled();
  });

  test('a device without a provider is unsupported', async () => {
    const statuses: PushStatus[] = [];
    const registration = makePushRegistration({
      provider: () => undefined,
      edge: makeEdge(),
      setStatus: (status) => statuses.push(status),
    });
    expect(await registration.enable()).toBe('unsupported');
    expect(await registration.refresh()).toBe('unsupported');
  });

  test('a provider contributed after registration was created is used', async () => {
    let provider: AppPush.Provider | undefined;
    const registration = makePushRegistration({ provider: () => provider, edge: makeEdge(), setStatus: () => {} });
    expect(await registration.enable()).toBe('unsupported');

    provider = makeProvider();
    expect(await registration.enable()).toBe('on');
  });

  test('disable unregisters from EDGE before dropping the subscription', async () => {
    const { provider, edge, registration } = setup();
    await registration.enable();

    expect(await registration.disable()).toBe('off');

    expect(edge.deletePushSubscription).toHaveBeenCalledWith(SUBSCRIPTION.endpoint);
    expect(provider.unsubscribe).toHaveBeenCalledOnce();
  });

  test('refresh re-registers without prompting when permission was granted', async () => {
    const { provider, edge, registration } = setup({ permission: 'granted' });

    expect(await registration.refresh()).toBe('on');

    expect(provider.requestPermission).not.toHaveBeenCalled();
    // A sample notification on every start would be noise; only the user's opt-in asks for one.
    expect(edge.putPushSubscription).toHaveBeenCalledWith(expect.objectContaining({ welcome: false }));
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
