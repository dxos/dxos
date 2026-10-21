//
// Copyright 2026 DXOS.org
//

import type * as AppPush from '@dxos/app-toolkit/AppPush';

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
  /** Resolves once the service worker registers; `undefined` when registration failed. */
  pushManager: Promise<PushManagerLike | undefined>;
  permission: () => AppPush.Permission;
  requestPermission: () => Promise<AppPush.Permission>;
};

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
}: PushProviderOptions): AppPush.Provider => {
  const pushManager = async (): Promise<PushManagerLike> => {
    const manager = supported ? await whenRegistered : undefined;
    if (!manager) {
      throw new Error('Push is not available on this device.');
    }
    return manager;
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
      const subscription = await (await whenRegistered)?.getSubscription();
      return subscription ? toDeviceSubscription(subscription) : undefined;
    },
    unsubscribe: async () => {
      if (!supported) {
        return;
      }
      await (await (await whenRegistered)?.getSubscription())?.unsubscribe();
    },
  };
};
