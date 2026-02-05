# Findings: Mobile OAuth Implementation for Tauri

## Research Summary

Researched OAuth 2.0 implementation options for native mobile apps (Android/iOS) built with Tauri, focusing on Google OAuth but applicable to other providers.

---

## Option 2 Deep Dive: App Links / Universal Links

This section details everything required to implement verified HTTPS-based deep links for mobile OAuth.

### Overview

App Links (Android) and Universal Links (iOS) allow your app to claim ownership of HTTPS URLs. When a user taps a link like `https://composer.dxos.org/redirect/oauth`, the OS verifies that your app is authorized to handle that domain and opens the app directly (instead of the browser).

**Security benefit**: Unlike custom URI schemes, the OS cryptographically verifies app ownership via server-hosted asset files.

---

### Part 1: Server-Side Requirements

You must host verification files on a domain you control. Based on current config, the identifier is `org.dxos.composer`.

#### Android: assetlinks.json

**Location**: `https://composer.dxos.org/.well-known/assetlinks.json`

**Content**:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "org.dxos.composer",
      "sha256_cert_fingerprints": [
        "<DEBUG_SIGNING_KEY_SHA256>",
        "<RELEASE_SIGNING_KEY_SHA256>"
      ]
    }
  }
]
```

**Getting SHA256 Fingerprints**:

1. **Debug key** (local development):
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android
   ```
   Look for the `SHA256:` line.

2. **Release key** (from Google Play Console):
   - Go to Play Console → Your App → Release → Setup → App signing
   - Copy the SHA256 fingerprint from "App signing key certificate"
   - Or use: `keytool -list -v -keystore your-release.keystore`

3. **If using Play App Signing**: Use the fingerprint from Play Console, not your local upload key.

**Requirements**:
- Must be served over HTTPS
- Content-Type: `application/json`
- File must be publicly accessible (no auth required)

#### iOS: apple-app-site-association

**Location**: `https://composer.dxos.org/.well-known/apple-app-site-association`

**Content**:
```json
{
  "applinks": {
    "details": [
      {
        "appIDs": [
          "<TEAM_ID>.org.dxos.composer"
        ],
        "components": [
          {
            "/": "/redirect/oauth",
            "comment": "OAuth redirect endpoint (matches Edge redirect path)"
          },
          {
            "/": "/redirect/oauth?*",
            "comment": "OAuth redirect with query params"
          }
        ]
      }
    ]
  }
}
```

**Getting Team ID**:
- From Apple Developer Portal: Account → Membership → Team ID
- Or from Xcode: Project → Signing & Capabilities → Team
- Or from `tauri.conf.json` if set in `bundle.iOS.developmentTeam`

**Requirements**:
- Must be served over HTTPS (valid certificate)
- Content-Type: `application/json`
- No `.json` extension in filename
- File size must not exceed 128 KB
- No redirects allowed when fetching

**Validation Tool**: https://branch.io/resources/aasa-validator/

---

### Part 2: Tauri Configuration Changes

#### 2.1 Install Deep Link Plugin

**Cargo.toml** (`packages/apps/composer-app/src-tauri/Cargo.toml`):
```toml
[dependencies]
# ... existing deps ...
tauri-plugin-deep-link = "2"
```

**JavaScript** (package.json):
```bash
pnpm add @tauri-apps/plugin-deep-link
```

#### 2.2 Update tauri.conf.json

Add to `plugins` section:
```json
{
  "plugins": {
    "updater": { ... },
    "deep-link": {
      "mobile": [
        {
          "scheme": ["https"],
          "host": "composer.dxos.org",
          "pathPrefix": ["/redirect"],
          "appLink": true
        }
      ],
      "desktop": {
        "schemes": ["composer"]
      }
    }
  }
}
```

**Note**:
- `appLink: true` enables verified App Links / Universal Links
- `pathPrefix: ["/redirect"]` matches the Edge redirect path `/redirect/oauth`
- Setting `appLink: false` would use custom URI schemes instead

#### 2.3 Add iOS Development Team

Update `bundle.iOS` section:
```json
{
  "bundle": {
    "iOS": {
      "developmentTeam": "<YOUR_TEAM_ID>"
    }
  }
}
```

#### 2.4 Add Capability Permissions

Create `capabilities/mobile.json`:
```json
{
  "identifier": "mobile-capability",
  "platforms": ["iOS", "android"],
  "windows": ["main"],
  "permissions": [
    "deep-link:default"
  ]
}
```

Or add to existing `default.json`:
```json
{
  "permissions": [
    "core:default",
    "deep-link:default",
    // ... rest of existing permissions
  ]
}
```

#### 2.5 Initialize Plugin in Rust

Update `src-tauri/src/lib.rs`:
```rust
use tauri_plugin_deep_link::DeepLinkExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        // ... other plugins
        .setup(|app| {
            // Handle deep links when app is already running
            #[cfg(any(target_os = "android", target_os = "ios"))]
            app.deep_link().on_open_url(|event| {
                println!("deep link received: {:?}", event.urls());
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### Part 3: JavaScript/TypeScript Integration

#### 3.1 Handle Deep Links in App

Create `packages/plugins/plugin-token-manager/src/oauth/mobile-handler.ts`:
```typescript
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import * as Effect from 'effect/Effect';

export const setupMobileOAuthHandler = (
  onOAuthCallback: (params: { accessTokenId: string; accessToken: string }) => void
) => {
  // Check if app was launched via deep link
  getCurrent().then((urls) => {
    if (urls) {
      urls.forEach((url) => handleOAuthUrl(url, onOAuthCallback));
    }
  });

  // Listen for deep links while app is running
  onOpenUrl((urls) => {
    urls.forEach((url) => handleOAuthUrl(url, onOAuthCallback));
  });
};

const handleOAuthUrl = (
  urlString: string,
  onOAuthCallback: (params: { accessTokenId: string; accessToken: string }) => void
) => {
  const url = new URL(urlString);

  // Check if this is an OAuth callback
  if (url.pathname !== '/redirect/oauth') {
    return;
  }

  const accessTokenId = url.searchParams.get('accessTokenId');
  const accessToken = url.searchParams.get('accessToken');

  if (accessTokenId && accessToken) {
    onOAuthCallback({ accessTokenId, accessToken });
  }
};
```

#### 3.2 Mobile OAuth Flow

Create `packages/plugins/plugin-token-manager/src/oauth/mobile-flow.ts`:
```typescript
import * as Effect from 'effect/Effect';
import { open } from '@tauri-apps/plugin-shell';

export const performMobileOAuthFlow = Effect.fn(function* (
  preset: OAuthPreset,
  accessToken: AccessToken.AccessToken,
  edgeClient: EdgeHttpClient,
  spaceId: string,
) {
  // 1. Initiate OAuth with Edge, specifying mobile redirect
  const { authUrl } = yield* Effect.tryPromise({
    try: () => edgeClient.initiateOAuthFlow({
      provider: preset.provider,
      scopes: preset.scopes,
      spaceId,
      accessTokenId: accessToken.id,
      // Tell Edge to redirect to our App Link URL
      redirectUri: 'https://composer.dxos.org/redirect/oauth',
    }),
    catch: (e) => new Error(`Failed to initiate OAuth: ${e}`),
  });

  // 2. Open system browser for authentication
  yield* Effect.tryPromise({
    try: () => open(authUrl),
    catch: (e) => new Error(`Failed to open browser: ${e}`),
  });

  // 3. Token will be received via deep link handler (setupMobileOAuthHandler)
  // The handler updates the token when callback is received
});
```

---

### Part 4: Edge Server Changes

The Edge server needs to support mobile redirect URIs.

#### 4.1 Update InitiateOAuthFlowRequest

In `packages/core/protocols/src/edge/edge.ts`:
```typescript
export type InitiateOAuthFlowRequest = {
  provider: OAuthProvider;
  spaceId: string;
  accessTokenId: string;
  scopes: string[];
  noRefresh?: boolean;
  loginHint?: string;
  // NEW: Allow client to specify redirect URI for mobile
  redirectUri?: string;
};
```

#### 4.2 Edge Callback Handling

When Google redirects to Edge after authentication:
1. Edge receives the OAuth callback with authorization code
2. Edge exchanges code for access token
3. **For mobile**: Edge redirects to `https://composer.dxos.org/redirect/oauth?accessTokenId=X&accessToken=Y`
4. **For web**: Edge uses postMessage (existing behavior)

The App Link URL triggers the mobile app to open and receive the token.

---

### Part 5: Testing

#### iOS Simulator
```bash
# Open URL in simulator
xcrun simctl openurl booted "https://composer.dxos.org/redirect/oauth?accessTokenId=test&accessToken=test123"
```

#### Android Emulator
```bash
# Open URL in emulator
adb shell am start -a android.intent.action.VIEW \
  -c android.intent.category.BROWSABLE \
  -d "https://composer.dxos.org/redirect/oauth?accessTokenId=test&accessToken=test123"
```

#### Verify Android App Links
```bash
# Check verification status
adb shell pm get-app-links org.dxos.composer

# Force re-verification (Android 12+)
adb shell pm verify-app-links --re-verify org.dxos.composer
```

#### Verify iOS Universal Links
```bash
# Check Apple's CDN for your AASA file
curl -I "https://app-site-association.cdn-apple.com/a/v1/composer.dxos.org"
```

---

### Part 6: Complete File Change Summary

| File | Change |
|------|--------|
| **Server (dxos.org)** | |
| `/.well-known/assetlinks.json` | Create with Android app fingerprints |
| `/.well-known/apple-app-site-association` | Create with iOS team/bundle ID |
| **Tauri App** | |
| `src-tauri/Cargo.toml` | Add `tauri-plugin-deep-link = "2"` |
| `package.json` | Add `@tauri-apps/plugin-deep-link` |
| `src-tauri/tauri.conf.json` | Add deep-link plugin config with mobile array |
| `src-tauri/capabilities/default.json` | Add `deep-link:default` permission |
| `src-tauri/src/lib.rs` | Initialize plugin, add deep link handler |
| **Token Manager Plugin** | |
| `src/oauth/mobile-handler.ts` | New: Handle incoming deep links |
| `src/oauth/mobile-flow.ts` | New: Mobile-specific OAuth flow |
| `src/components/NewTokenSelector.tsx` | Add mobile platform detection and flow |
| **Protocols** | |
| `src/edge/edge.ts` | Add `redirectUri` to InitiateOAuthFlowRequest |
| **Edge Server** | |
| OAuth callback handler | Support redirect to App Link URL |

---

### Part 7: Considerations & Trade-offs

#### Pros
- **Most secure**: OS-verified domain ownership
- **Google recommended**: Won't be deprecated
- **Better UX**: No browser interstitial asking which app to open
- **Works across all OAuth providers**: Not Google-specific

#### Cons
- **Server infrastructure required**: Must host and maintain asset files
- **Certificate management**: SHA256 fingerprints change with signing keys
- **Deployment complexity**: Asset files must be updated when app signing changes
- **Testing complexity**: Requires valid HTTPS domain (can use ngrok for development)

#### Operational Considerations
- **Fingerprint rotation**: When releasing new versions with different signing keys, update assetlinks.json
- **Play App Signing**: If using Google Play App Signing, use their fingerprint (not your upload key)
- **CDN caching**: Apple CDN caches AASA files; changes may take hours to propagate
- **Multiple environments**: May need different domains for dev/staging/prod

---

---

## Complete Implementation Code

### 1. Server Verification Files

#### assetlinks.json (Android)

Deploy to `https://composer.dxos.org/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "org.dxos.composer",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

**To get your fingerprint:**
```bash
# Debug key
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android | grep SHA256

# Release key (or get from Google Play Console if using Play App Signing)
keytool -list -v -keystore your-release.keystore | grep SHA256
```

#### apple-app-site-association (iOS)

Deploy to `https://composer.dxos.org/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": [
          "XXXXXXXXXX.org.dxos.composer"
        ],
        "components": [
          {
            "/": "/redirect/oauth",
            "comment": "OAuth callback - exact match"
          },
          {
            "/": "/redirect/oauth?*",
            "comment": "OAuth callback with query params"
          }
        ]
      }
    ]
  }
}
```

Replace `XXXXXXXXXX` with your Apple Team ID.

---

### 2. Cargo.toml Changes

File: `packages/apps/composer-app/src-tauri/Cargo.toml`

Add to `[dependencies]`:
```toml
tauri-plugin-deep-link = "2"
```

---

### 3. tauri.conf.json Changes

File: `packages/apps/composer-app/src-tauri/tauri.conf.json`

Add to `plugins` section:
```json
{
  "plugins": {
    "updater": { ... },
    "deep-link": {
      "mobile": [
        {
          "scheme": ["https"],
          "host": "composer.dxos.org",
          "pathPrefix": ["/redirect/oauth"],
          "appLink": true
        }
      ],
      "desktop": {
        "schemes": ["composer"]
      }
    }
  },
  "bundle": {
    "iOS": {
      "developmentTeam": "XXXXXXXXXX"
    }
  }
}
```

---

### 4. Capabilities Configuration

File: `packages/apps/composer-app/src-tauri/capabilities/default.json`

Add `"deep-link:default"` to permissions:
```json
{
  "permissions": [
    "core:default",
    "core:window:allow-start-dragging",
    "os:default",
    "process:default",
    "deep-link:default",
    {
      "identifier": "shell:allow-spawn",
      ...
    },
    "shell:allow-open"
  ]
}
```

---

### 5. Rust Plugin Initialization

File: `packages/apps/composer-app/src-tauri/src/lib.rs`

```rust
//! Composer Tauri application entry point.

mod oauth;
#[cfg(target_os = "macos")]
mod menubar;
#[cfg(target_os = "macos")]
mod spotlight;

use oauth::OAuthServerState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Only include updater plugin for non-mobile targets.
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    // Initialize tauri-nspanel plugin for macOS spotlight panel.
    #[cfg(target_os = "macos")]
    let builder = builder.plugin(tauri_nspanel::init());

    // Configure plugins.
    let builder = {
        let builder = builder
            .plugin(tauri_plugin_os::init())
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_deep_link::init());  // <-- ADD THIS

        // Spotlight panel and global shortcut are macOS-only.
        #[cfg(target_os = "macos")]
        {
            use spotlight::{toggle_spotlight, SpotlightConfig};
            use tauri_plugin_global_shortcut::ShortcutState;

            let spotlight_config = SpotlightConfig::default();
            let config_for_shortcut = spotlight_config.clone();

            builder.plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_shortcuts([spotlight_config.shortcut.as_str()])
                    .unwrap()
                    .with_handler(move |app, _shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                            if let Err(e) = toggle_spotlight(app, &config_for_shortcut) {
                                eprintln!("[spotlight] Error toggling spotlight: {}", e);
                            }
                        }
                    })
                    .build(),
            )
        }
        #[cfg(not(target_os = "macos"))]
        {
            builder
        }
    };

    // Configure invoke handler with platform-specific commands.
    #[cfg(target_os = "macos")]
    let builder = builder.invoke_handler(tauri::generate_handler![
        oauth::start_oauth_server,
        oauth::stop_oauth_server,
        oauth::get_oauth_result,
        oauth::initiate_oauth_flow,
        spotlight::hide_spotlight,
    ]);

    #[cfg(not(target_os = "macos"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        oauth::start_oauth_server,
        oauth::stop_oauth_server,
        oauth::get_oauth_result,
        oauth::initiate_oauth_flow,
    ]);

    builder
        .manage(OAuthServerState::new())
        .setup(move |app| {
            // Initialize logging in debug mode.
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize menu bar (macOS only).
            #[cfg(target_os = "macos")]
            {
                let spotlight_config = spotlight::SpotlightConfig::default();
                if let Err(e) = menubar::init_menubar(app.handle(), spotlight_config) {
                    log::error!("Failed to initialize menu bar: {}", e);
                }
            }

            // Deep link handler for mobile OAuth callbacks.
            // Note: The JavaScript side handles the actual URL parsing via onOpenUrl().
            // This Rust handler is optional for logging/debugging.
            #[cfg(any(target_os = "android", target_os = "ios"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().on_open_url(|event| {
                    log::info!("Deep link received: {:?}", event.urls());
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### 6. Platform Detection Utility

File: `packages/common/util/src/tauri.ts` (new file)

```typescript
//
// Copyright 2025 DXOS.org
//

import { isTauri } from './platform';

/**
 * Checks if running on Tauri mobile (iOS or Android).
 * Returns false on desktop Tauri, web, or Node.
 */
export const isTauriMobile = async (): Promise<boolean> => {
  if (!isTauri()) {
    return false;
  }

  try {
    const { platform } = await import('@tauri-apps/plugin-os');
    const currentPlatform = platform();
    return currentPlatform === 'ios' || currentPlatform === 'android';
  } catch {
    return false;
  }
};

/**
 * Checks if running on Tauri desktop (macOS, Windows, Linux).
 */
export const isTauriDesktop = async (): Promise<boolean> => {
  if (!isTauri()) {
    return false;
  }

  try {
    const { platform } = await import('@tauri-apps/plugin-os');
    const currentPlatform = platform();
    return ['macos', 'windows', 'linux'].includes(currentPlatform);
  } catch {
    return false;
  }
};

/**
 * Synchronous check for Tauri mobile using navigator.
 * Less reliable but doesn't require async.
 */
export const isTauriMobileSync = (): boolean => {
  if (!isTauri()) {
    return false;
  }
  // On mobile Tauri, maxTouchPoints is typically > 0.
  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
};
```

Update `packages/common/util/src/index.ts` to export:
```typescript
export * from './tauri';
```

---

### 7. Mobile Deep Link Handler

File: `packages/plugins/plugin-token-manager/src/oauth/mobile-deep-link.ts` (new file)

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';
import { type OAuthFlowResult } from '@dxos/protocols';

const OAUTH_REDIRECT_PATH = '/redirect/oauth';

/**
 * Parses an OAuth redirect URL and extracts the result.
 * Edge redirects to: {origin}/redirect/oauth?accessTokenId=X&accessToken=Y
 */
export const parseOAuthRedirectUrl = (urlString: string): OAuthFlowResult | null => {
  try {
    const url = new URL(urlString);

    // Check if this is an OAuth redirect from Edge.
    if (!url.pathname.endsWith(OAUTH_REDIRECT_PATH)) {
      return null;
    }

    const accessTokenId = url.searchParams.get('accessTokenId');
    const accessToken = url.searchParams.get('accessToken');
    const error = url.searchParams.get('error');
    const reason = url.searchParams.get('reason');

    if (error || reason) {
      return {
        success: false,
        reason: reason || error || 'Unknown error',
      };
    }

    if (accessTokenId && accessToken) {
      return {
        success: true,
        accessTokenId,
        accessToken,
      };
    }

    return null;
  } catch (e) {
    log.warn('Failed to parse OAuth callback URL', { urlString, error: e });
    return null;
  }
};

/**
 * Callback type for OAuth results.
 */
export type OAuthCallbackHandler = (result: OAuthFlowResult) => void;

/**
 * Sets up the mobile deep link handler for OAuth callbacks.
 * Call this once during app initialization.
 *
 * @param onCallback - Called when an OAuth callback is received.
 * @returns Cleanup function to remove the listener.
 */
export const setupMobileOAuthDeepLinkHandler = async (
  onCallback: OAuthCallbackHandler,
): Promise<() => void> => {
  const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link');

  // Handle URLs that launched the app (cold start).
  const startUrls = await getCurrent();
  if (startUrls) {
    for (const url of startUrls) {
      const result = parseOAuthRedirectUrl(url);
      if (result) {
        log.info('OAuth redirect from cold start', { url });
        onCallback(result);
      }
    }
  }

  // Handle URLs while app is running (warm start).
  const unlisten = await onOpenUrl((urls) => {
    for (const url of urls) {
      const result = parseOAuthRedirectUrl(url);
      if (result) {
        log.info('OAuth redirect received', { url });
        onCallback(result);
      }
    }
  });

  return unlisten;
};

/**
 * Effect version of setupMobileOAuthDeepLinkHandler.
 */
export const setupMobileOAuthDeepLinkHandlerEffect = (onCallback: OAuthCallbackHandler) =>
  Effect.tryPromise({
    try: () => setupMobileOAuthDeepLinkHandler(onCallback),
    catch: (error) => new Error(`Failed to setup deep link handler: ${error}`),
  });
```

**Note**: The path `/redirect/oauth` matches what Edge already uses for the redirect fallback.

---

### 8. Mobile OAuth Flow

File: `packages/plugins/plugin-token-manager/src/oauth/mobile-flow.ts` (new file)

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Deferred from 'effect/Deferred';
import * as Fiber from 'effect/Fiber';

import { type EdgeHttpClient } from '@dxos/edge-client';
import { log } from '@dxos/log';
import { type OAuthFlowResult } from '@dxos/protocols';
import { type AccessToken } from '@dxos/types';

import { type OAuthPreset } from '../defs';
import { OAUTH_TIMEOUT_MS, type OAuthInitiator } from './oauth-flow';

/**
 * The origin that mobile will use for OAuth redirects.
 * Edge captures this from the Origin header and redirects to {origin}/redirect/oauth
 */
const MOBILE_ORIGIN = 'https://composer.dxos.org';

/**
 * Pending OAuth flows awaiting callback.
 * Maps accessTokenId -> Deferred that resolves with the result.
 */
const pendingFlows = new Map<string, Deferred.Deferred<OAuthFlowResult, Error>>();

/**
 * Registers a pending OAuth flow.
 * Called when initiating an OAuth flow.
 */
export const registerPendingOAuthFlow = (accessTokenId: string): Deferred.Deferred<OAuthFlowResult, Error> => {
  const deferred = Deferred.unsafeMake<OAuthFlowResult, Error>(Fiber.unsafeCurrentFiber());
  pendingFlows.set(accessTokenId, deferred);
  return deferred;
};

/**
 * Resolves a pending OAuth flow with the result.
 * Called by the deep link handler when a callback is received.
 */
export const resolvePendingOAuthFlow = (result: OAuthFlowResult): boolean => {
  if (!result.success) {
    // For failures, we don't have accessTokenId, so resolve all pending.
    for (const [id, deferred] of pendingFlows) {
      Effect.runSync(Deferred.fail(deferred, new Error(result.reason)));
      pendingFlows.delete(id);
    }
    return pendingFlows.size > 0;
  }

  const deferred = pendingFlows.get(result.accessTokenId);
  if (deferred) {
    Effect.runSync(Deferred.succeed(deferred, result));
    pendingFlows.delete(result.accessTokenId);
    return true;
  }

  log.warn('Received OAuth callback for unknown flow', { accessTokenId: result.accessTokenId });
  return false;
};

/**
 * Opens a URL in the system browser.
 */
const openBrowser = (url: string) =>
  Effect.tryPromise({
    try: async () => {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    },
    catch: (error) => new Error(`Failed to open browser: ${error}`),
  });

/**
 * Creates a mobile OAuth initiator that sets Origin to the mobile app's domain.
 * This uses Tauri's Rust HTTP client to bypass browser Origin header restrictions.
 *
 * Edge will capture this Origin and redirect to {origin}/redirect/oauth after OAuth completes.
 */
export const createMobileOAuthInitiator = (): OAuthInitiator => ({
  initiate: (params) =>
    Effect.tryPromise({
      try: async () => {
        const { invoke } = await import('@tauri-apps/api/core');
        // Reuse the existing Tauri command but with mobile origin.
        return invoke<string>('initiate_oauth_flow', {
          edgeUrl: params.edgeUrl,
          provider: params.provider,
          scopes: params.scopes,
          spaceId: params.spaceId,
          accessTokenId: params.accessTokenId,
          // Use mobile origin instead of localhost - Edge will redirect here.
          redirectOrigin: MOBILE_ORIGIN,
          authHeader: params.authHeader,
        });
      },
      catch: (error) => new Error(`Failed to initiate OAuth flow: ${error}`),
    }),
});

/**
 * Performs OAuth flow on mobile using App Links / Universal Links.
 *
 * Flow:
 * 1. Register pending flow with deferred result.
 * 2. Call Edge to initiate OAuth with Origin: https://composer.dxos.org
 *    (Edge stores this origin and will redirect to {origin}/redirect/oauth)
 * 3. Open system browser to auth URL.
 * 4. Wait for deep link callback (handled by setupMobileOAuthDeepLinkHandler).
 * 5. Update token with result.
 *
 * NOTE: No Edge changes needed - Edge already redirects to {requestOrigin}/redirect/oauth
 * when window.opener is null (which it will be from mobile browser).
 */
export const performMobileOAuthFlow = Effect.fn(function* (
  preset: OAuthPreset,
  accessToken: AccessToken.AccessToken,
  edgeClient: EdgeHttpClient,
  spaceId: string,
) {
  log.info('Starting mobile OAuth flow', { provider: preset.provider, accessTokenId: accessToken.id });

  // 1. Register pending flow.
  const deferred = registerPendingOAuthFlow(accessToken.id);

  // Get auth header if available.
  let authHeader: string | undefined;
  if ((edgeClient as any)['_authHeader']) {
    authHeader = (edgeClient as any)['_authHeader'];
  }

  // Create mobile initiator that sets Origin to mobile domain.
  const initiator = createMobileOAuthInitiator();

  try {
    // 2. Initiate OAuth with Edge using mobile origin.
    // Edge will capture Origin header and use it for redirect after OAuth.
    const authUrl = yield* initiator.initiate({
      edgeUrl: edgeClient.baseUrl,
      provider: preset.provider,
      scopes: preset.scopes,
      spaceId,
      accessTokenId: accessToken.id,
      redirectOrigin: MOBILE_ORIGIN,
      authHeader,
    });

    log.info('Opening browser for OAuth', { authUrl });

    // 3. Open system browser to auth URL (not relay page - direct to auth).
    yield* openBrowser(authUrl);

    // 4. Wait for callback with timeout.
    const result = yield* Effect.race(
      Deferred.await(deferred),
      Effect.sleep(`${OAUTH_TIMEOUT_MS} millis`).pipe(
        Effect.flatMap(() => Effect.fail(new Error('OAuth flow timed out'))),
      ),
    );

    // 5. Update token with result.
    if (!result.success) {
      return yield* Effect.fail(new Error(`OAuth flow failed: ${result.reason}`));
    }

    accessToken.token = result.accessToken;
    log.info('Mobile OAuth flow completed successfully', { accessTokenId: accessToken.id });
  } finally {
    // Cleanup pending flow on any exit.
    pendingFlows.delete(accessToken.id);
  }
});
```

**Key insight**: Mobile reuses the existing Tauri `initiate_oauth_flow` Rust command but sets
`redirectOrigin: 'https://composer.dxos.org'` instead of `http://localhost:{port}`. Edge captures
this from the Origin header and redirects to `{origin}/redirect/oauth` after OAuth completes.

---

### 9. Update NewTokenSelector

File: `packages/plugins/plugin-token-manager/src/components/NewTokenSelector.tsx`

Update the `createOauthPreset` function:

```typescript
import { isTauri } from '@dxos/util';

// Add at module level or import from a shared location.
const isTauriMobileSync = (): boolean => {
  if (!isTauri()) {
    return false;
  }
  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
};

// Inside the component:
const createOauthPreset = async (preset?: OAuthPreset) => {
  if (!preset) {
    onCustomToken?.();
    return;
  }

  const token = Obj.make(AccessToken.AccessToken, {
    source: preset.source,
    note: preset.note,
    token: '',
  });

  tokenMap.set(token.id, token);

  if (isTauri()) {
    if (isTauriMobileSync()) {
      // Mobile Tauri path: Use App Links / Universal Links.
      const { performMobileOAuthFlow } = await import('../oauth/mobile-flow');
      await runAndForwardErrors(
        performMobileOAuthFlow(preset, token, edgeClient, spaceId).pipe(
          Effect.tap(() => enrichGoogleTokenWithEmail(token)),
          Effect.tap(() => onAddAccessToken(token)),
          Effect.catchAll((error) => Effect.sync(() => log.catch(error))),
        ),
      );
    } else {
      // Desktop Tauri path: Use localhost server.
      await runAndForwardErrors(
        performOAuthFlow(
          preset,
          token,
          edgeClient,
          spaceId,
          createTauriServerProvider(),
          openTauriBrowser,
          createTauriOAuthInitiator(),
        ).pipe(
          Effect.tap(() => enrichGoogleTokenWithEmail(token)),
          Effect.tap(() => onAddAccessToken(token)),
          Effect.catchAll((error) => Effect.sync(() => log.catch(error))),
        ),
      );
    }
  } else {
    // Web path: Use window.open + postMessage.
    const { authUrl } = await edgeClient.initiateOAuthFlow({
      provider: preset.provider,
      scopes: preset.scopes,
      spaceId,
      accessTokenId: token.id,
    });

    log.info('open', { authUrl });
    window.open(authUrl, 'oauthPopup', 'width=500,height=600');
  }
};
```

---

### 10. Initialize Deep Link Handler in App

The deep link handler should be initialized early in the app lifecycle. Add to the app's main initialization:

```typescript
// In app initialization (e.g., plugin setup or App component).
import { isTauri } from '@dxos/util';
import { setupMobileOAuthDeepLinkHandler, resolvePendingOAuthFlow } from '@dxos/plugin-token-manager';

const initializeApp = async () => {
  // ... other initialization ...

  // Setup mobile OAuth deep link handler.
  if (isTauri()) {
    try {
      const { platform } = await import('@tauri-apps/plugin-os');
      if (['ios', 'android'].includes(platform())) {
        await setupMobileOAuthDeepLinkHandler(resolvePendingOAuthFlow);
      }
    } catch (e) {
      // Not on mobile or plugin not available.
    }
  }
};
```

---

### 11. Edge Server Changes

**NO CHANGES NEEDED.**

The existing Edge OAuth redirect mechanism already supports mobile:

```typescript
// packages/services/kms-service/src/oauth/redirect-page.ts
if (window.opener && requestOrigin) {
  // Web: postMessage to opener
  window.opener.postMessage(oauthResult, requestOrigin);
} else if (requestOrigin) {
  // Desktop/Mobile: redirect to origin (THIS IS WHAT MOBILE USES)
  window.location.href = `${requestOrigin}/redirect/oauth?accessTokenId=...&accessToken=...`;
}
```

Edge captures `requestOrigin` from the `Origin` HTTP header when `/oauth/initiate` is called.
Mobile sets `Origin: https://composer.dxos.org`, so Edge redirects there after OAuth.

---

## Development Workflow

### 1. Get Signing Keys

**Android Debug Key:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android
```

**Apple Team ID:**
- Apple Developer Portal → Account → Membership → Team ID

### 2. Deploy Verification Files

1. Create `assetlinks.json` with your SHA256 fingerprint
2. Create `apple-app-site-association` with your Team ID
3. Deploy to `composer.dxos.org/.well-known/`
4. Verify with:
   ```bash
   curl https://composer.dxos.org/.well-known/assetlinks.json
   curl https://composer.dxos.org/.well-known/apple-app-site-association
   ```

### 3. Build and Test

```bash
# Build for iOS
pnpm tauri ios build

# Build for Android
pnpm tauri android build

# Test deep link on iOS Simulator
xcrun simctl openurl booted "https://composer.dxos.org/redirect/oauth?accessTokenId=test&accessToken=test123"

# Test deep link on Android Emulator
adb shell am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "https://composer.dxos.org/redirect/oauth?accessTokenId=test&accessToken=test123"
```

### 4. Verify App Links

```bash
# Android
adb shell pm get-app-links org.dxos.composer

# iOS (check Apple CDN)
curl -I "https://app-site-association.cdn-apple.com/a/v1/composer.dxos.org"
```

---

### References

- [Tauri Deep Linking Plugin](https://v2.tauri.app/plugin/deep-linking/)
- [Tauri OS Plugin](https://v2.tauri.app/plugin/os-info/)
- [Android App Links Documentation](https://developer.android.com/training/app-links/verify-android-applinks)
- [iOS Universal Links Documentation](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)
- [Google Digital Asset Links](https://developers.google.com/digital-asset-links/v1/getting-started)
- [AASA Validator](https://branch.io/resources/aasa-validator/)
