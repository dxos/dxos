//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import { getVapidPublicKey, urlBase64ToUint8Array } from './util';

/** Whether this device can register for web push (PWA/browser, non-native). */
export const isWebPushSupported = (): boolean =>
  !isTauri() && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof PushManager !== 'undefined';

const deviceKeyOf = (client: Client): string => client.halo.device?.deviceKey.toHex() ?? 'unknown';

const registerWeb = async (client: Client): Promise<void> => {
  if (!isWebPushSupported()) {
    log.info('web push unsupported');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    log.info('notification permission not granted', { permission });
    return;
  }

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) {
    log.warn('VITE_VAPID_PUBLIC_KEY is not set — cannot subscribe to web push');
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    log.warn('incomplete push subscription', { json });
    return;
  }

  await client.edge.http.registerPushSubscription(Context.default(), {
    transport: 'web-push',
    deviceKey: deviceKeyOf(client),
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    metadata: { userAgent: navigator.userAgent },
  });
  log.info('registered for web push');
};

const registerNative = async (client: Client): Promise<void> => {
  // The native shell (Tauri) registers with APNs and returns the hex device token via a
  // `plugin:push|request_token` command — see the Workstream C native wiring.
  const { invoke } = await import('@tauri-apps/api/core');
  const token = await invoke<string | undefined>('plugin:push|request_token').catch((error) => {
    log.warn('native push token request failed', { error });
    return undefined;
  });
  if (!token) {
    return;
  }

  await client.edge.http.registerPushSubscription(Context.default(), {
    transport: 'apns',
    deviceKey: deviceKeyOf(client),
    token,
  });
  log.info('registered for native (APNs) push');
};

/**
 * Register the current device for push, authenticated as the current account. Must be called
 * from a user gesture on the web (it triggers the OS permission prompt).
 */
export const registerForPush = async (client: Client): Promise<void> => {
  if (!client.halo.identity.get()) {
    log.warn('cannot register for push without an identity');
    return;
  }
  try {
    if (isTauri()) {
      await registerNative(client);
    } else {
      await registerWeb(client);
    }
  } catch (error) {
    log.catch(error);
  }
};

/** Remove this device's push registration (on logout / opt-out). */
export const unregisterPush = async (client: Client): Promise<void> => {
  try {
    if (isWebPushSupported()) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      await subscription?.unsubscribe();
    }
    await client.edge.http.unregisterPushSubscription(Context.default(), { deviceKey: deviceKeyOf(client) });
  } catch (error) {
    log.catch(error);
  }
};

/**
 * Re-establish the device's registration on boot, without prompting: only if web-push
 * permission is already granted (covers `pushsubscriptionchange` while the app was closed).
 */
export const reconcilePush = async (client: Client): Promise<void> => {
  if (!client.halo.identity.get()) {
    return;
  }
  if (isTauri()) {
    await registerForPush(client);
  } else if (isWebPushSupported() && Notification.permission === 'granted') {
    await registerForPush(client);
  }
};
