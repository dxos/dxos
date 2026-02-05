# Task Plan: Mobile OAuth with App Links / Universal Links

## Overview

Implement OAuth flows for mobile (iOS/Android) using verified deep links (App Links / Universal Links). This enables secure OAuth callbacks that the OS routes directly to the app without browser interstitials.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MOBILE OAUTH FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User taps "Add Google" in Composer mobile app                           │
│                                                                              │
│  2. App calls Edge: POST /oauth/initiate                                    │
│     Body: { provider, scopes, spaceId, accessTokenId,                       │
│             redirectUri: "https://composer.dxos.org/oauth-callback" }       │
│     Response: { authUrl: "https://accounts.google.com/o/oauth2/v2/auth?..." }│
│                                                                              │
│  3. App opens system browser to authUrl                                     │
│     (Using @tauri-apps/plugin-shell open())                                  │
│                                                                              │
│  4. User authenticates with Google in browser                               │
│                                                                              │
│  5. Google redirects to Edge callback endpoint                              │
│                                                                              │
│  6. Edge exchanges code for token, then redirects:                          │
│     → https://composer.dxos.org/oauth-callback?                             │
│         accessTokenId=xxx&accessToken=yyy                                   │
│                                                                              │
│  7. OS intercepts HTTPS URL (App Link / Universal Link)                     │
│     - Verifies app ownership via assetlinks.json / AASA                     │
│     - Opens Composer app directly                                           │
│                                                                              │
│  8. Tauri deep-link plugin receives URL                                     │
│     - onOpenUrl() callback fires                                            │
│     - App extracts accessTokenId & accessToken from URL                     │
│                                                                              │
│  9. App stores token in ECHO database                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phases

### Phase 1: Infrastructure Setup
- [x] Research complete
- [ ] Deploy `/.well-known/assetlinks.json` to composer.dxos.org
- [ ] Deploy `/.well-known/apple-app-site-association` to composer.dxos.org
- [ ] Verify files are accessible and correctly formatted
- [ ] Get SHA256 fingerprints for Android signing keys
- [ ] Get Apple Team ID for iOS

### Phase 2: Tauri Deep Link Plugin Integration
- [ ] Add `tauri-plugin-deep-link` to Cargo.toml
- [ ] Add `@tauri-apps/plugin-deep-link` to package.json
- [ ] Configure deep-link in tauri.conf.json
- [ ] Add deep-link permissions to capabilities
- [ ] Initialize plugin in lib.rs
- [ ] Add iOS development team to bundle config

### Phase 3: Platform Detection
- [ ] Add `isTauriMobile()` utility function
- [ ] Update NewTokenSelector to detect mobile platform
- [ ] Create platform-specific OAuth flow routing

### Phase 4: Mobile OAuth Flow Implementation
- [ ] Create mobile deep link handler module
- [ ] Create mobile OAuth flow module
- [ ] Implement pending token state management
- [ ] Handle app cold start via deep link
- [ ] Handle deep link while app is running

### Phase 5: Edge Server Updates
- [x] **NO CHANGES NEEDED** - Existing redirect mechanism works
- Edge already redirects to `${requestOrigin}/redirect/oauth?...` when `window.opener` is null
- Mobile just needs to set `Origin: https://composer.dxos.org` header

### Phase 6: Testing & Verification
- [ ] Test on iOS Simulator
- [ ] Test on Android Emulator
- [ ] Verify App Link verification status
- [ ] Test cold start deep link
- [ ] Test warm start deep link
- [ ] Test error scenarios

---

## Key Decisions

1. **Domain**: Using `composer.dxos.org` for App Links (matches product naming)
2. **Path**: Using `/redirect/oauth` (matches existing Edge redirect path)
3. **Token delivery**: Token included in URL query params (same as desktop redirect)
4. **State management**: Pending tokens stored in Map by accessTokenId (same pattern as web)
5. **Origin header**: Mobile uses Rust HTTP client to set `Origin: https://composer.dxos.org`

---

## Files to Create

| File | Purpose |
|------|---------|
| `packages/plugins/plugin-token-manager/src/oauth/mobile-deep-link.ts` | Deep link handler for OAuth callbacks |
| `packages/plugins/plugin-token-manager/src/oauth/mobile-flow.ts` | Mobile-specific OAuth flow |
| `packages/common/util/src/tauri.ts` | Tauri platform detection utilities |
| `packages/apps/composer-app/src-tauri/capabilities/mobile.json` | Mobile-specific permissions |

## Files to Modify

| File | Change |
|------|--------|
| `packages/apps/composer-app/src-tauri/Cargo.toml` | Add deep-link plugin |
| `packages/apps/composer-app/package.json` | Add @tauri-apps/plugin-deep-link |
| `packages/apps/composer-app/src-tauri/tauri.conf.json` | Add deep-link config + iOS team |
| `packages/apps/composer-app/src-tauri/src/lib.rs` | Initialize deep-link plugin |
| `packages/apps/composer-app/src-tauri/capabilities/default.json` | Add deep-link permission |
| `packages/plugins/plugin-token-manager/src/components/NewTokenSelector.tsx` | Add mobile flow branch |
| `packages/plugins/plugin-token-manager/src/oauth/index.ts` | Export mobile modules |

**Note:** No Edge/protocol changes needed - existing `Origin` header mechanism works.

## Server Files to Create

| File | Content |
|------|---------|
| `composer.dxos.org/.well-known/assetlinks.json` | Android App Links verification |
| `composer.dxos.org/.well-known/apple-app-site-association` | iOS Universal Links verification |

---

## Dependencies

- Apple Team ID (from Apple Developer Portal)
- Android signing key SHA256 fingerprints (debug + release)
- Domain control for composer.dxos.org

**Note:** No Edge server changes required.

---

## Notes

### Security Considerations
- Tokens are transmitted via HTTPS URL (encrypted in transit)
- App Links / Universal Links are OS-verified (no impersonation)
- No localhost server needed (unlike desktop)
- PKCE would be an enhancement if Edge supports it

### Platform Detection
The app already has `tauri-plugin-os` installed. Use:
```typescript
import { platform } from '@tauri-apps/plugin-os';
const isMobileTauri = () => isTauri() && ['ios', 'android'].includes(platform());
```

### Deep Link URL Format
```
https://composer.dxos.org/redirect/oauth?accessTokenId=<id>&accessToken=<token>
```
This matches the existing Edge redirect format - no Edge changes needed.

### Testing Commands
```bash
# iOS Simulator
xcrun simctl openurl booted "https://composer.dxos.org/redirect/oauth?accessTokenId=test&accessToken=test123"

# Android Emulator
adb shell am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "https://composer.dxos.org/redirect/oauth?accessTokenId=test&accessToken=test123"

# Verify Android App Links
adb shell pm get-app-links org.dxos.composer
```
