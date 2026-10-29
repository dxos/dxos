//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Duration from 'effect/Duration';
import type * as Atom from 'effect/reactivity/Atom';

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
   * Resolves true once this device shows a test push, or false when `timeout` passes first. It starts listening on
   * the call, so call it before asking for the test: the push can arrive before the request returns.
   */
  waitForTest: (timeout: Duration.Input) => Promise<boolean>;
};

/**
 * Where this device stands on push.
 * - `unsupported`: no push provider here, or the deployment has push turned off.
 * - `pending`: turning on is in progress.
 * - `denied`: the user blocked notifications in the browser or OS.
 */
export type Status = 'unsupported' | 'off' | 'pending' | 'denied' | 'on' | 'failed';

/**
 * Whether a test notification reached this device; `failed` means it could not be sent. A local notification reads
 * `sent`, since the system does not confirm that it displayed one.
 */
export type TestResult = 'shown' | 'not-shown' | 'sent' | 'failed';

/**
 * Push notifications for this device, kept registered with the server that sends them. Contributed by the plugin
 * that owns that registration; any platform's settings can drive it.
 */
export type Notifications = {
  status: Atom.Atom<Status>;
  /** Why the last attempt failed, as the browser or the server put it. */
  error: Atom.Atom<string | undefined>;
  /** Whether the user turned notifications on for this device; kept across restarts, which finish registering. */
  enabled: Atom.Atom<boolean>;
  /** Turns notifications on; call it from the user's click, since it may show the permission prompt. */
  enable: () => Promise<Status>;
  disable: () => Promise<Status>;
  /** Asks the server for a test notification and waits for it to reach this device. */
  sendTest: () => Promise<TestResult>;
};

/** A notification this device shows by itself, without a push. */
export type LocalNotification = {
  title: string;
  body: string;
};

/**
 * Shows notifications while the app runs, on a platform with no push service (the desktop app). Contributed by the
 * plugin that owns the platform's notification API.
 */
export type LocalNotifier = {
  show: (notification: LocalNotification) => Promise<void>;
};
