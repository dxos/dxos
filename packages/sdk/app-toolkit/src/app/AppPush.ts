//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Duration from 'effect/Duration';

/**
 * Whether the user lets this app show notifications on this device, as the OS or browser reports it.
 * `default` means not asked yet.
 */
export type Permission = 'default' | 'granted' | 'denied';

/** A browser push subscription (`PushSubscription.toJSON()`), sent to EDGE so it can push to this device. */
export type WebPushSubscription = {
  kind: 'webpush';
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** What a device hands EDGE to be reachable by push; grows an APNs and an FCM token with the native platforms. */
export type DeviceSubscription = WebPushSubscription;

/**
 * The device side of push, contributed by whichever plugin owns it on this platform (`plugin-pwa` for the
 * web). It knows nothing about EDGE: registering the subscription is the consumer's job, so every platform
 * shares one registration path and one settings row.
 */
export type Provider = {
  /** False where this device cannot receive pushes at all (no push service, or no service worker). */
  readonly supported: boolean;
  permission: () => Permission;
  /**
   * Asks the user, unless they have already answered. On the web this must be the first thing a click
   * handler awaits: anything awaited before it can end the gesture, and the browser then refuses unasked.
   */
  requestPermission: () => Promise<Permission>;
  /** Subscribes this device, replacing a subscription made with another key; needs permission `granted`. */
  subscribe: (options: { applicationServerKey: string }) => Promise<DeviceSubscription>;
  /** This device's current subscription, if it has one. */
  current: () => Promise<DeviceSubscription | undefined>;
  /** Drops this device's subscription; a no-op without one. */
  unsubscribe: () => Promise<void>;
  /**
   * Resolves true once this device shows a sample push, or false when `timeout` passes first. It starts listening
   * on the call, so call it before asking for the sample: the push can arrive before the request returns.
   */
  waitForSample: (timeout: Duration.Input) => Promise<boolean>;
};
