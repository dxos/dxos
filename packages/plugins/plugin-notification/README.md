# @dxos/plugin-notification

Push notifications for Composer. Registers the current device with the Edge notification
service and surfaces incoming notifications as in-app toasts.

## How it works

- **Service worker** (`composer-app/src/sw.ts`) listens for `push` / `notificationclick` /
  `pushsubscriptionchange`. On `push` it relays the payload over a `BroadcastChannel('dxos:push')`;
  if no window is focused it also shows an OS notification.
- **Lifecycle module** (`capabilities/notifications-lifecycle.ts`) bridges that channel to
  `LayoutOperation.AddToast` and reconciles the device's registration on boot.
- **Settings panel** (`components/NotificationsSettings`) exposes an "Enable notifications"
  button — the user gesture required to request `Notification.permission`.
- **`push-manager.ts`** registers the device against the current account via
  `client.edge.http.registerPushSubscription` (authenticated by verifiable presentation):
  - Web/PWA → `PushManager.subscribe` with the VAPID public key, `transport: 'web-push'`.
  - Native (Tauri) → APNs device token, `transport: 'apns'`.

## Configuration

### Web Push (VAPID)

Set the VAPID public key at build time:

```
VITE_VAPID_PUBLIC_KEY=<base64url public key>
```

The matching private key is an Edge secret (`VAPID_PRIVATE_KEY`). Generate a pair with any
VAPID/web-push keygen (raw P-256: 65-byte public point, 32-byte private scalar, base64url).

### Native iOS (APNs) — Workstream C

The native path calls a Tauri command `plugin:push|request_token` that must register with APNs
and return the hex device token. This requires native shell work that cannot be exercised without
an Apple Developer account and a real device:

1. **Tauri plugin** — add a Rust plugin (e.g. `tauri-plugin-remote-push`, or a small custom
   plugin) exposing a `request_token` command that calls
   `UNUserNotificationCenter.requestAuthorization` + `registerForRemoteNotifications`, and returns
   the APNs device token. Register it in `src-tauri/Cargo.toml` and `tauri.conf.json`, and grant
   the permission in `src-tauri/capabilities/*.json`.
2. **iOS capabilities** — add the **Push Notifications** capability and **Background Modes →
   Remote notifications** to the generated iOS project (`src-tauri/gen/apple/`). `apns-topic` on
   the Edge side must equal the app bundle id (`APNS_TOPIC`).
3. **APNs auth key** — create a `.p8` key in the Apple Developer portal; its contents, Key ID, and
   Team ID become the Edge secrets/vars `APNS_AUTH_KEY` / `APNS_KEY_ID` / `APNS_TEAM_ID`. Use
   `APNS_ENV=sandbox` for dev builds.
4. **Testing** — remote APNs requires a physical device (not the simulator).

Until the native command exists, `registerForPush` degrades gracefully on native (logs and
returns); the web path is fully functional.

### Android (FCM) — followup

Android native push requires Firebase Cloud Messaging. The Edge `PushTransport` abstraction and
the `transport: 'fcm'` wire shape are already in place; adding it is a self-contained followup
(Firebase project, `google-services.json`, an `FcmTransport` in the notification service, and a
Tauri FCM token plugin on the client).
