//
// Copyright 2026 DXOS.org
//

/// <reference lib="webworker" />

// Push only, apart from the offline worker (`sw.ts`): it activates without waiting for the precache, and builds with no
// offline worker still get it.

import { describePushMessage, parsePushMessage } from './notification.ts';

declare const self: ServiceWorkerGlobalScope;

/**
 * Posted to every window once a test push is shown, so the page that asked for one knows push works end to
 * end. Mirrored in `@dxos/plugin-pwa`'s push provider — keep in sync.
 */
const PUSH_TEST_SHOWN = 'dxos:push-test-shown';

// Unlike the offline worker, nothing here needs a page reload to take effect, so a new version takes over at once.
self.addEventListener('install', () => {
  void self.skipWaiting();
});

/** TypeScript's lib leaves out `renotify` because only Chromium implements it; other browsers ignore it. */
type ChromiumNotificationOptions = NotificationOptions & { renotify?: boolean };

/**
 * Safari revokes a subscription whose pushes do not each show a notification, so on Apple's push service one is
 * shown even while Composer has focus. Elsewhere a focused window already toasts the notice itself.
 */
const mustShowNotification = async (): Promise<boolean> => {
  const subscription = await self.registration.pushManager.getSubscription();
  return !subscription || new URL(subscription.endpoint).hostname.endsWith('.push.apple.com');
};

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let data: unknown;
      try {
        data = event.data?.json();
      } catch {
        data = undefined;
      }
      const message = parsePushMessage(data) ?? { v: 1, id: 'unknown', senderDid: '', sentAt: Date.now() };

      // A test must show even with Composer focused: the user is looking at the button that asked for it.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (!message.test && windows.some((client) => client.focused) && !(await mustShowNotification())) {
        return;
      }

      const { title, body, tag, url } = describePushMessage(message);
      const options: ChromiumNotificationOptions = {
        body,
        tag,
        // Without it a notification reusing a tag (a second invitation to the same space) replaces the first silently.
        renotify: true,
        icon: '/pwa-192x192.png',
        data: { url },
      };
      await self.registration.showNotification(title, options);
      if (message.test) {
        for (const client of windows) {
          client.postMessage({ type: PUSH_TEST_SHOWN });
        }
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // An open window has already toasted the notice with its own Join action; reloading it to follow the link
      // would throw away its state, so it is only brought forward.
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        return;
      }
      const url = typeof event.notification.data?.url === 'string' ? event.notification.data.url : '/';
      await self.clients.openWindow(new URL(url, self.location.origin).href);
    })(),
  );
});
