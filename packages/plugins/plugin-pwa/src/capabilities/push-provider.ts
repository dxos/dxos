//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';

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

/** Where the service worker's messages arrive (`navigator.serviceWorker`). */
export type WorkerMessagesLike = {
  addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
  removeEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
};

/** Posted by the host's push worker once it shows a test push; mirrors `composer-app/src/push/push-worker.ts`. */
const PUSH_TEST_SHOWN = 'dxos:push-test-shown';

const isTestShown = (data: unknown): boolean => Predicate.isObject(data) && data.type === PUSH_TEST_SHOWN;

export type PushProviderOptions = {
  supported: boolean;
  /** Undefined where there is no service worker; a test push is then never confirmed. */
  messages: WorkerMessagesLike | undefined;
  /** Resolves once the push worker is active, which subscribing needs; `undefined` when registration failed. */
  pushManager: Promise<PushManagerLike | undefined>;
  permission: () => AppPush.Permission;
  requestPermission: () => Promise<AppPush.Permission>;
  /** How long to wait for the worker to activate before giving up. */
  activationTimeout?: Duration.Input;
  /** How long to wait for the browser's push service to answer a subscribe. */
  serviceTimeout?: Duration.Input;
};

/** The push worker precaches nothing, so it activates almost at once; this only catches one that never does. */
const DEFAULT_ACTIVATION_TIMEOUT = Duration.seconds(15);

/** Firefox leaves a subscribe pending while it cannot reach its push service, which would leave the toggle on forever. */
const DEFAULT_SERVICE_TIMEOUT = Duration.seconds(30);

/** Resolves like `promise`, or throws `message` once `timeout` passes. */
const within = async <T>(promise: () => Promise<T>, timeout: Duration.Input, message: string): Promise<T> => {
  const result = await EffectEx.runPromise(Effect.promise(promise).pipe(Effect.timeoutOption(timeout)));
  if (Option.isNone(result)) {
    throw new Error(message);
  }
  return result.value;
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
  messages,
  pushManager: whenRegistered,
  permission,
  requestPermission,
  activationTimeout = DEFAULT_ACTIVATION_TIMEOUT,
  serviceTimeout = DEFAULT_SERVICE_TIMEOUT,
}: PushProviderOptions): AppPush.Provider => {
  const pushManager = async (): Promise<PushManagerLike> => {
    // A worker whose install failed never activates; failing beats leaving the toggle spinning forever.
    const manager = await within(
      () => (supported ? whenRegistered : Promise.resolve(undefined)),
      activationTimeout,
      "Composer's notification worker did not start. Reload and try again.",
    );
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
      const subscription = await within(
        () => manager.subscribe({ userVisibleOnly: true, applicationServerKey: key }),
        serviceTimeout,
        "This browser's push service did not answer. Check that this browser can receive push notifications.",
      );
      return toDeviceSubscription(subscription);
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
    waitForTest: async (timeout) => {
      if (!supported || !messages) {
        return false;
      }
      let listener: ((event: MessageEvent) => void) | undefined;
      // The executor runs now, so the listener is attached before the caller asks for the test.
      const shown = new Promise<void>((resolve) => {
        listener = (event) => {
          if (isTestShown(event.data)) {
            resolve();
          }
        };
        messages.addEventListener('message', listener);
      });
      try {
        return Option.isSome(
          await EffectEx.runPromise(Effect.promise(() => shown).pipe(Effect.timeoutOption(timeout))),
        );
      } finally {
        if (listener) {
          messages.removeEventListener('message', listener);
        }
      }
    },
  };
};
