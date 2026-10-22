//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import type * as AppPush from '@dxos/app-toolkit/AppPush';
import * as EffectEx from '@dxos/effect/EffectEx';

/** The parts of a browser `PushSubscription` the provider reads, so it can be driven without a browser. */
export type PushSubscriptionLike = {
  readonly options: { readonly applicationServerKey: ArrayBuffer | null };
  toJSON: () => { endpoint?: string; keys?: Record<string, string> };
  /** Only awaited; the resolved value is not read. */
  unsubscribe: () => Promise<unknown>;
};

export type PushManagerLike = {
  getSubscription: () => Promise<PushSubscriptionLike | null>;
  subscribe: (options: {
    userVisibleOnly: boolean;
    applicationServerKey: Uint8Array<ArrayBuffer>;
  }) => Promise<PushSubscriptionLike>;
};

export type PushProviderOptions = {
  supported: boolean;
  /** Resolves once the service worker is active, which push needs; `undefined` when registration failed. */
  pushManager: Promise<PushManagerLike | undefined>;
  permission: () => AppPush.Permission;
  requestPermission: () => Promise<AppPush.Permission>;
  /** How long to wait for the worker to activate before giving up. */
  activationTimeout?: Duration.Input;
};

/** A first install precaches the whole build before the worker activates, which takes a while on a slow link. */
const DEFAULT_ACTIVATION_TIMEOUT = Duration.minutes(1);

const decodeBase64Url = (value: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));

const sameBytes = (first: Uint8Array, second: Uint8Array) =>
  first.length === second.length && first.every((byte, index) => byte === second[index]);

const toDeviceSubscription = (subscription: PushSubscriptionLike): AppPush.WebPushSubscription => {
  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error('Push subscription has no endpoint or keys.');
  }
  return { kind: 'webpush', endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
};

/** The web's push provider: the browser's push service, reached through the service worker registration. */
export const makePushProvider = ({
  supported,
  pushManager: whenRegistered,
  permission,
  requestPermission,
  activationTimeout = DEFAULT_ACTIVATION_TIMEOUT,
}: PushProviderOptions): AppPush.Provider => {
  const pushManager = async (): Promise<PushManagerLike> => {
    const manager = await EffectEx.runPromise(
      // A worker whose install failed never activates; failing beats leaving the toggle spinning forever.
      Effect.promise(() => (supported ? whenRegistered : Promise.resolve(undefined))).pipe(
        Effect.timeoutOption(activationTimeout),
      ),
    );
    if (Option.isNone(manager)) {
      throw new Error('Composer is still installing for offline use. Try again shortly.');
    }
    if (!manager.value) {
      throw new Error('Push is not available on this device.');
    }
    return manager.value;
  };

  return {
    supported,
    permission,
    requestPermission: async () => (permission() === 'default' ? requestPermission() : permission()),
    subscribe: async ({ applicationServerKey }) => {
      const manager = await pushManager();
      const key = decodeBase64Url(applicationServerKey);
      const existing = await manager.getSubscription();
      const existingKey = existing?.options.applicationServerKey;
      if (existing && existingKey && sameBytes(new Uint8Array(existingKey), key)) {
        return toDeviceSubscription(existing);
      }

      // The push service refuses messages signed with a different key, and a browser holds one subscription per
      // registration, so a subscription from before a key rotation is replaced rather than reused.
      await existing?.unsubscribe();
      return toDeviceSubscription(await manager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
    },
    current: async () => {
      if (!supported) {
        return undefined;
      }
      const subscription = await (await pushManager()).getSubscription();
      return subscription ? toDeviceSubscription(subscription) : undefined;
    },
    unsubscribe: async () => {
      if (!supported) {
        return;
      }
      await (await (await pushManager()).getSubscription())?.unsubscribe();
    },
  };
};
