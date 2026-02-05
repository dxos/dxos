# Edge Server: Mobile OAuth - NO CHANGES NEEDED

## Summary

**No Edge server changes are required for mobile OAuth support.**

The existing OAuth redirect mechanism already supports mobile use cases.

---

## How It Already Works

From `packages/services/kms-service/src/oauth/redirect-page.ts`:

```typescript
// Primary: PostMessage to opener window
if (window.opener && requestOrigin) {
  window.opener.postMessage(oauthResult, requestOrigin);
  window.close();
}
// Fallback: Direct redirect (THIS IS WHAT MOBILE WILL USE)
else if (requestOrigin) {
  window.location.href = `${requestOrigin}/redirect/oauth?accessTokenId=...&accessToken=...`;
}
```

The `requestOrigin` is captured from the `Origin` HTTP header when `/oauth/initiate` is called:

```typescript
// packages/services/kms-service/src/oauth/handler.ts
await env.GLOBAL_KV.put(
  `oauth_auth_context_${state}`,
  JSON.stringify({
    requestOrigin: request.headers.get('origin') || '',  // Captured from Origin header
    // ...
  }),
  { expirationTtl: STATE_TTL_SECONDS }
);
```

---

## Mobile Flow (Uses Existing Mechanism)

1. **Mobile app calls `/oauth/initiate`** with `Origin: https://composer.dxos.org` header
   - Must use Tauri Rust HTTP client to set custom Origin (browsers restrict this)

2. **Edge stores the origin** in KV with the OAuth state

3. **User completes OAuth** in system browser

4. **Google redirects to Edge callback**

5. **Edge redirect page executes**:
   - `window.opener` is `null` (opened from mobile browser, not popup)
   - Falls back to redirect: `https://composer.dxos.org/redirect/oauth?accessTokenId=X&accessToken=Y`

6. **Mobile OS intercepts the HTTPS URL** (App Link / Universal Link)
   - Verifies app ownership via `assetlinks.json` / `apple-app-site-association`
   - Opens Composer app with the URL

7. **App extracts tokens** from URL query params

---

## What Mobile Client Must Do

### 1. Set Origin Header

Mobile must set `Origin: https://composer.dxos.org` when calling `/oauth/initiate`.

This requires using Tauri's Rust HTTP client (same as desktop), since browsers don't allow setting custom Origin headers.

### 2. Configure Deep Link Path

The deep link must handle `/redirect/oauth` path (this is what Edge already uses):

```json
{
  "plugins": {
    "deep-link": {
      "mobile": [
        {
          "scheme": ["https"],
          "host": "composer.dxos.org",
          "pathPrefix": ["/redirect/oauth"],
          "appLink": true
        }
      ]
    }
  }
}
```

### 3. Handle URL Query Params

Extract `accessTokenId` and `accessToken` from the redirect URL.

---

## Security Note

Edge already validates origins implicitly - it only redirects to the origin that initiated the request. This provides the same security as adding an allowlist.

However, if you want additional security for which origins can initiate OAuth, that would need to be added to the `/oauth/initiate` handler (validate the `Origin` header against an allowlist before storing it).

---

## Potential Future Enhancement (Optional)

If you want more explicit control, you could add a `redirectUri` field to the request body. But this is **not required** - the existing Origin-based mechanism works.

The only reason to add `redirectUri` would be if you need:
- More explicit API contract (body field vs header)
- Different redirect path than `/redirect/oauth`
- Override capability (redirect somewhere other than origin)
