# Fetching & rendering: why the browser extension

This plugin scrapes listings from arbitrary vendor sites. Getting their HTML is harder than a
`fetch()` for three compounding reasons — the "chain of constraints" — which is why we route some
fetches through the `@dxos/composer-crx` browser extension.

## The chain of constraints

1. **CORS.** The plugin runs in the Composer page. A plain `fetch('https://vendor.com')` is blocked
   cross-origin, so we can't read arbitrary sites directly from the app.
2. **The edge proxy solves CORS but not SPAs.** `proxyFetchLegacy` fetches server-side (bypassing
   CORS), but for a client-rendered site (e.g. AutoTrader) the **server HTML is an empty shell** —
   the listings are rendered by JavaScript in the browser, so the proxy returns markup with no
   results.
3. **Anti-bot.** Even a server-side headless renderer (Cloudflare Browser Rendering, edge Playwright)
   hits the site from a **datacenter IP with no session**, so anti-bot (DataDome / PerimeterX /
   Cloudflare) serves a challenge page instead of listings.

## Why not just `window.open` a window from the app?

The app *can* open a window, but the **same-origin policy** forbids it from **reading** that window:

```js
const win = window.open('https://vendor.com/...');
win.document; // ❌ blocked — cross-origin
```

A plain page can launch the popup but gets zero access to its rendered DOM. (Cross-origin iframes
are equally unreadable, and most sites send `X-Frame-Options` / CSP `frame-ancestors` to forbid
framing anyway.) Only a **browser extension** — with `host_permissions` + `chrome.scripting` — can
execute a script in another origin's tab/window and read its rendered HTML.

## The two real options

| Approach | Renders JS? | Passes anti-bot? | Needs a server? |
|---|---|---|---|
| **Browser extension (CRX)** | ✅ (real browser) | ✅ (user's IP + session) | ❌ |
| Server-side headless browser | ✅ | ❌ (datacenter IP, no session) | ✅ |

The CRX wins for client-rendered / anti-bot sites because it renders in the **user's own browser** —
residential IP, their cookies/session, real JS execution. It isn't bypassing bot detection; it's the
user's browser viewing pages they can already access. It renders in an **unfocused popup window**, so
the page is `document.visibilityState: 'visible'` (passing visibility-gated anti-bot that blocks
background tabs) without stealing focus from Composer.

## When the CRX is (and isn't) needed

- **Needed:** client-rendered SPAs and/or anti-bot sites (most modern listing sites).
- **Not needed:** server-rendered HTML or a real JSON API — the edge proxy alone works.

`fetchPage` encodes this: it prefers the CRX render-proxy when the extension is present and falls
back to the edge proxy otherwise. So the extension is an *enhancement* for hard sites, not a hard
dependency for every provider.

## Where this lives in the code

- `util/fetch.ts` — `fetchPage`: render-proxy-preferred, edge-proxy fallback.
- `util/renderViaCrx.ts` — page-side client for the CRX render contract.
- `operations/render-page.ts` — `RenderPage` operation: the main-thread bridge that performs the
  render where the extension relay lives (callable from the DOM-less agent spawn).
- `@dxos/composer-crx` `src/search-proxy/*` — the extension side (popup-window render → HTML).
- See `@dxos/plugin-extension` for the user-facing render-proxy settings.
