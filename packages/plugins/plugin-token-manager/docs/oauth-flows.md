# OAuth Flows in Token Manager Plugin

This document describes the different OAuth flows implemented in the token manager plugin for various platforms.

## Overview

The token manager plugin supports OAuth authentication across four different environments:

| Environment | Callback Mechanism | Browser | Key Component |
|-------------|-------------------|---------|---------------|
| Web | `postMessage` | Popup window | `window.open()` |
| Native Desktop (Tauri) | Localhost HTTP server | System browser | Rust HTTP server |
| Native Mobile (Tauri) | Custom URL scheme | ASWebAuthenticationSession | `tauri-plugin-web-auth` |
| CLI | Localhost HTTP server | System browser | Bun HTTP server |

## Common Components

All flows share these components:

- **Edge OAuth Service**: Handles OAuth initiation and token exchange
- **OAuth Presets**: Pre-configured providers (e.g., Google Gmail, Calendar)
- **AccessToken**: ECHO object that stores the resulting token

---

## 1. Web Flow

**File**: `NewTokenSelector.tsx`

### Sequence Diagram

```
Main Window                        Edge                         Google
     |                              |                              |
     |  POST /oauth/initiate        |                              |
     |----------------------------->|                              |
     |                              |                              |
     |  { authUrl }                 |                              |
     |<-----------------------------|                              |
     |                              |                              |
     |  window.open(authUrl) -----> |                              |
     |                              |                              |
     |                              |  redirect to Google          |
     |                              |----------------------------->|
     |                              |                              |
     |                              |         (user authenticates) |
     |                              |                              |
     |                              |  redirect with code          |
     |                              |<-----------------------------|
     |                              |                              |
     |                              |  exchange code for token     |
     |                              |----------------------------->|
     |                              |                              |
     |                              |  { access_token }            |
     |                              |<-----------------------------|
     |                              |                              |
     |  postMessage({ token }) <--- |                              |
     |                              |                              |
     |                              |                              |
     |                              |                              |
```

### How It Works

1. **Initiation**: Main window calls `edgeClient.initiateOAuthFlow()` to get an `authUrl` from Edge
2. **Open Popup**: Main window opens `authUrl` in a popup via `window.open()`
3. **Redirect to Google**: The `authUrl` (Edge URL) redirects the popup to Google's OAuth consent screen
4. **Authentication**: User authenticates with Google in the popup
5. **Callback to Edge**: Google redirects back to Edge's callback URL with an authorization code
6. **Token Exchange**: Edge exchanges the authorization code for an access token
7. **PostMessage**: Edge's callback page (still in popup) uses `window.opener.postMessage()` to send the token to the main window
8. **Receive**: Main window's `message` event listener receives the token
9. **Close**: Popup window closes automatically (via `window.close()`)

### Key Code

```typescript
// Web path: Use window.open + postMessage approach.
const { authUrl } = await edgeClient.initiateOAuthFlow({
  provider: preset.provider,
  scopes: preset.scopes,
  spaceId,
  accessTokenId: token.id,
});

window.open(authUrl, 'oauthPopup', 'width=500,height=600');

// Listener receives token via postMessage
window.addEventListener('message', (event) => {
  if (event.origin !== edgeOrigin) return;
  const data = event.data as OAuthFlowResult;
  // Update token with data.accessToken
});
```

---

## 2. Native Desktop Flow (Tauri)

**Files**: `oauth-flow.ts`, `tauri-server.ts`, `oauth/server.rs`, `oauth/mod.rs`

### Sequence Diagram

```
App                       Tauri                    Edge                    Google
 |                          |                        |                       |
 |  start_server            |                        |                       |
 |------------------------->|                        |                       |
 |                          |                        |                       |
 |  { port }                |                        |                       |
 |<-------------------------|                        |                       |
 |                          |                        |                       |
 |  initiate_oauth (Origin: localhost:port)          |                       |
 |-------------------------------------------------->|                       |
 |                          |                        |                       |
 |  { authUrl }             |                        |                       |
 |<--------------------------------------------------|                       |
 |                          |                        |                       |
 |  open browser to localhost:port/oauth-relay       |                       |
 |------------------------->|                        |                       |
 |                          |                        |                       |
 |                          |   relay page redirects to authUrl              |
 |                          |----------------------->|                       |
 |                          |                        |                       |
 |                          |                        |  redirect to Google   |
 |                          |                        |---------------------->|
 |                          |                        |                       |
 |                          |                        |  (user authenticates) |
 |                          |                        |                       |
 |                          |                        |  redirect with code   |
 |                          |                        |<----------------------|
 |                          |                        |                       |
 |                          |                        |  exchange code        |
 |                          |                        |---------------------->|
 |                          |                        |                       |
 |                          |                        |  { access_token }     |
 |                          |                        |<----------------------|
 |                          |                        |                       |
 |                          |   redirect to localhost:port/redirect/oauth    |
 |                          |<-----------------------|                       |
 |                          |                        |                       |
 |                          |  (store result)        |                       |
 |                          |                        |                       |
 |  poll for result         |                        |                       |
 |------------------------->|                        |                       |
 |                          |                        |                       |
 |  { token }               |                        |                       |
 |<-------------------------|                        |                       |
 |                          |                        |                       |
 |  stop_server             |                        |                       |
 |------------------------->|                        |                       |
```

### How It Works

1. **Start Server**: Rust HTTP server starts on random localhost port
2. **Initiation**: Rust makes request to Edge with `Origin: http://localhost:{port}`
3. **Open Browser**: System browser opens relay page at `localhost:{port}/oauth-relay`
4. **Relay**: Relay page redirects to OAuth provider's auth URL
5. **Authentication**: User authenticates with the OAuth provider
6. **Callback**: Provider redirects to Edge, which redirects to `localhost:{port}/redirect/oauth`
7. **Store Result**: Rust server stores the token, shows success page
8. **Poll**: TypeScript polls for result via Tauri command
9. **Cleanup**: Server stops after receiving token

### Key Code

```typescript
// Desktop path: Use localhost server for OAuth callback.
yield* performOAuthFlow(
  preset,
  token,
  edgeClient,
  spaceId,
  createTauriServerProvider(),  // Rust HTTP server
  openTauriBrowser,              // @tauri-apps/plugin-opener
  createTauriOAuthInitiator(),   // Rust HTTP client (sets Origin header)
);
```

### Why Rust Server?

- **Origin Header**: Browsers don't allow setting the `Origin` header. Rust can set it correctly.
- **Localhost Callback**: Desktop apps can't use public URLs for callbacks.
- **No Port Conflicts**: Server binds to port 0 (random available port).

---

## 3. Native Mobile Flow (Tauri iOS/Android)

**Files**: `mobile-flow.ts`, `mobile-deep-link.ts`

### Sequence Diagram

```
App                   ASWebAuthSession              Edge                Google
 |                           |                        |                    |
 |  initiate_oauth (nativeAppRedirect: true)          |                    |
 |--------------------------------------------------->|                    |
 |                           |                        |                    |
 |  { authUrl }              |                        |                    |
 |<---------------------------------------------------|                    |
 |                           |                        |                    |
 |  authenticate(authUrl, "composer")                 |                    |
 |-------------------------->|                        |                    |
 |                           |                        |                    |
 |                           |  load authUrl          |                    |
 |                           |----------------------->|                    |
 |                           |                        |                    |
 |                           |                        |  redirect to Google|
 |                           |                        |-------------------->
 |                           |                        |                    |
 |                           |                        |    (user auths)    |
 |                           |                        |                    |
 |                           |                        |  redirect + code   |
 |                           |                        |<--------------------
 |                           |                        |                    |
 |                           |                        |  exchange code     |
 |                           |                        |------------------->|
 |                           |                        |                    |
 |                           |                        |  { token }         |
 |                           |                        |<-------------------|
 |                           |                        |                    |
 |                           |  302 redirect to composer://oauth/callback  |
 |                           |<-----------------------|                    |
 |                           |                        |                    |
 |  { callbackUrl }          |                        |                    |
 |<--------------------------|                        |                    |
 |                           |                        |                    |
 |  (parse token from URL)   |                        |                    |
 |                           |                        |                    |
```

### How It Works

1. **Initiation**: Rust makes request to Edge with `nativeAppRedirect: true`
2. **Secure Browser**: `tauri-plugin-web-auth` opens ASWebAuthenticationSession (iOS) or Custom Tabs (Android)
3. **Authentication**: User authenticates in the secure browser
4. **Callback**: Google redirects to Edge callback
5. **302 Redirect**: Edge returns `302 redirect` to `composer://oauth/callback?accessToken=...`
6. **Capture**: ASWebAuthenticationSession captures the custom URL scheme
7. **Return**: Browser closes, callback URL returned to app
8. **Parse**: App extracts token from callback URL parameters

### Key Code

```typescript
// Mobile path: Use ASWebAuthenticationSession
const authUrl = yield* oauthInitiator.initiate({
  // ...
  nativeAppRedirect: true,  // Tell Edge to use 302 redirect
});

const { authenticate } = await import('tauri-plugin-web-auth-api');
const response = await authenticate({
  url: authUrl,
  callbackScheme: 'composer',  // Capture composer:// URLs
});

// Parse token from response.callbackUrl
const url = new URL(response.callbackUrl);
const accessToken = url.searchParams.get('accessToken');
```

### Why ASWebAuthenticationSession?

- **Security**: Sandboxed browser, separate from Safari
- **Password Autofill**: Integrates with iOS Keychain
- **No JavaScript Navigation**: `window.location.href` is blocked for security
- **Custom Scheme Capture**: Automatically captures redirects to registered schemes

### Why `nativeAppRedirect`?

ASWebAuthenticationSession blocks JavaScript navigation (`window.location.href`). Edge normally returns a JavaScript page, but with `nativeAppRedirect: true`, it returns a 302 redirect that ASWebAuthenticationSession can follow.

---

## 4. CLI Flow

**File**: `cli/commands/integration/oauth.ts`

### Sequence Diagram

```
CLI                    Bun Server                 Edge                    Google
 |                          |                        |                       |
 |  create server           |                        |                       |
 |------------------------->|                        |                       |
 |                          |                        |                       |
 |  { port }                |                        |                       |
 |<-------------------------|                        |                       |
 |                          |                        |                       |
 |  initiateOAuth (Origin: localhost:port)           |                       |
 |-------------------------------------------------->|                       |
 |                          |                        |                       |
 |  { authUrl }             |                        |                       |
 |<--------------------------------------------------|                       |
 |                          |                        |                       |
 |  spawn browser to localhost:port/oauth-relay      |                       |
 |------------------------->|                        |                       |
 |                          |                        |                       |
 |                          |   relay page redirects to authUrl              |
 |                          |----------------------->|                       |
 |                          |                        |                       |
 |                          |                        |  redirect to Google   |
 |                          |                        |---------------------->|
 |                          |                        |                       |
 |                          |                        |   (user authenticates)|
 |                          |                        |                       |
 |                          |                        |  redirect with code   |
 |                          |                        |<----------------------|
 |                          |                        |                       |
 |                          |                        |  exchange code        |
 |                          |                        |---------------------->|
 |                          |                        |                       |
 |                          |                        |  { access_token }     |
 |                          |                        |<----------------------|
 |                          |                        |                       |
 |                          |   redirect to localhost:port/redirect/oauth    |
 |                          |<-----------------------|                       |
 |                          |                        |                       |
 |                          |  (store result)        |                       |
 |                          |                        |                       |
 |  poll for result         |                        |                       |
 |------------------------->|                        |                       |
 |                          |                        |                       |
 |  { token }               |                        |                       |
 |<-------------------------|                        |                       |
```

### How It Works

1. **Start Server**: Bun HTTP server (Effect Platform) starts on random port
2. **Initiation**: Effect HTTP client makes request to Edge
3. **Open Browser**: Uses system command (`open` on macOS, `xdg-open` on Linux)
4. **Relay**: Server serves relay page that redirects to auth URL
5. **Authentication**: User authenticates in browser
6. **Callback**: Edge redirects to `localhost:{port}/redirect/oauth`
7. **Store Result**: Bun server stores token, shows success page
8. **Poll**: CLI polls for result
9. **Cleanup**: Server stops

### Key Code

```typescript
// CLI uses Bun HTTP server
const createBunServerProvider = (): OAuthServerProvider => ({
  start: () =>
    Effect.gen(function* () {
      const port = yield* Effect.promise(() => getPort({ random: true }));
      // ... create Effect Platform HTTP server with BunHttpServer
    }),
});

// Open browser using system command
const openBrowser = (url: string): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: () => {
      const command = platform() === 'darwin' ? 'open' : 'xdg-open';
      spawn(command, [url], { stdio: 'ignore' });
    },
  });
```

### Why Bun Server?

- **Effect Integration**: Uses Effect Platform for consistent error handling
- **No Tauri**: CLI runs outside Tauri, can't use Rust server
- **Cross-Platform**: Works on macOS, Linux, Windows

---

## Comparison Table

| Aspect | Web | Desktop | Mobile | CLI |
|--------|-----|---------|--------|-----|
| **Server** | None | Rust (hyper) | None | Bun (Effect) |
| **Browser** | Popup | System | ASWebAuthSession | System |
| **Callback** | postMessage | localhost redirect | Custom scheme 302 | localhost redirect |
| **Origin Header** | Browser | Rust | Rust | Effect HTTP |
| **Token Delivery** | postMessage | HTTP + poll | URL params | HTTP + poll |
| **Cleanup** | Window close | Server stop | Auto close | Server stop |

---

## Security Considerations

1. **Origin Validation**: Edge validates Origin header matches registered redirect URLs
2. **State Parameter**: OAuth state prevents CSRF attacks
3. **HTTPS**: All Edge communication uses HTTPS
4. **Localhost Only**: Desktop/CLI servers bind to 127.0.0.1 only
5. **Custom Scheme**: Mobile uses hardcoded `composer://` scheme in Edge
6. **ASWebAuthenticationSession**: iOS sandboxes the auth browser for security

---

## Future Improvements: Unified Token Delivery

Currently, each platform uses a different mechanism to deliver the token back to the app:

| Platform | Token Delivery                 |
|----------|--------------------------------|
| Web      | `postMessage` from popup       |
| Desktop  | Localhost HTTP server          |
| Mobile   | Custom URL scheme query params |
| CLI      | Localhost HTTP server          |

This complexity exists because each platform has different constraints for getting the token from Edge back into the application.

**Recommended future approach: Server-side storage + ECHO sync**

A simpler and more secure approach would eliminate the need to deliver the token to the client entirely:

1. Edge stores the token server-side, associated with the `accessTokenId`
2. Edge writes the token directly to the ECHO `AccessToken` object
3. The client simply waits for the token to sync via ECHO replication
4. The callback URL only signals success/failure (no token in URL)

This approach:
- **Unifies all platforms** - no platform-specific token delivery mechanisms needed
- **More secure** - token never appears in URLs, postMessage, or HTTP responses
- **Simpler client code** - just wait for ECHO sync instead of handling callbacks
- **Leverages existing infrastructure** - ECHO already syncs data between Edge and clients

The OAuth initiation would remain platform-specific (opening browsers, handling redirects), but token delivery would be identical across web, desktop, mobile, and CLI.
