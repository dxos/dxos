# Task: Add CORS support to the Composer image-service Worker

## Context

You're working on the Cloudflare Worker deployed at `https://image-service-main.dxos.workers.dev` (custom domain `images.dxos.org` is also planned but currently unmapped). The Worker exposes `POST /thumbnail` which accepts a `multipart/form-data` body with a `file` field (image blob) and returns `{ "url": "<public-url>" }`. It is consumed by three Composer surfaces today:

1. `packages/apps/composer-crx/src/actions/image.ts` — Chrome extension "Create thumbnail" action. Works today because Chrome extensions have a relaxed origin model.
2. `packages/plugins/plugin-crm/src/operations/attach-image.ts` — DXOS Effect operation that uploads images for Person/Organization avatars. May run server-side; CORS may or may not currently bite it.
3. `packages/plugins/plugin-support/src/containers/FeedbackPanel/screenshot.ts` — NEW. Web-app feature that captures a screenshot client-side and uploads it for inclusion in a prefilled GitHub-issue URL.

## The Bug

When the web app at `http://localhost:5173` (dev) or `https://composer.space` (prod) does a `fetch('https://image-service-main.dxos.workers.dev/thumbnail', { method: 'POST', body: <FormData> })`, the browser blocks the response with:

    Access to fetch at 'https://image-service-main.dxos.workers.dev/thumbnail' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
    POST https://image-service-main.dxos.workers.dev/thumbnail net::ERR_FAILED 200 (OK)

The POST actually reaches the worker and returns 200, but without `Access-Control-Allow-Origin` the browser discards the response. The fix is server-side.

## What to Do

1.  **Add a CORS allowlist** (env var or inline constant) covering at minimum:
    - `http://localhost:5173` (composer-app vite dev)
    - `http://localhost:9009` (storybook)
    - `https://composer.space`
    - `https://labs.composer.space`
    - Any staging hosts (e.g. `https://composer-staging.dxos.org`; check existing deployment configs).
    - Optional: `*` if the worker truly should be public, but allowlist is safer given there's no auth yet.

2.  **Handle OPTIONS preflight** (the browser sends this before any non-simple POST):

    if (request.method === 'OPTIONS') {
    return new Response(null, {
    headers: {
    'Access-Control-Allow-Origin': pickOrigin(request),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    },
    });
    }

3.  **Echo `Access-Control-Allow-Origin` on the actual POST response** (both the success and error paths):

    return new Response(JSON.stringify({ url }), {
    headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': pickOrigin(request),
    'Vary': 'Origin',
    },
    });

4.  **`pickOrigin` helper**: read `request.headers.get('Origin')`. If it's in the allowlist, return it; otherwise return `null` and have the caller omit the `Access-Control-Allow-Origin` header entirely (or return a 403). Do NOT fall back to a default allowlist entry — that lets a non-allowlisted origin spoof an allowed one and weakens the policy. `Vary: Origin` is required whenever you emit `Access-Control-Allow-Origin` so caches don't serve a response for one origin to another.

5.  **Test from a browser** — open https://composer.space (or your dev host), open DevTools, paste:

        const fd = new FormData();
        fd.append('file', new Blob(['x'], { type: 'image/png' }), 'test.png');
        const res = await fetch('https://image-service-main.dxos.workers.dev/thumbnail', { method: 'POST', body: fd });
        console.log(res.status, await res.json());

    Should print a 200 and a URL.

## Out of Scope (Separate Tasks)

- Adding auth/bearer tokens to the endpoint (anonymous abuse vector) — separate task.
- Rate limiting per IP / per token — separate task.
- `/raw` endpoint that bypasses any thumbnail resize — separate task; for now the `/thumbnail` resolution is acceptable for support screenshots.
- DNS mapping `images.dxos.org` to the worker — separate task.

## Acceptance

- A browser POST from each of the allowlisted origins returns 200 and a readable JSON body.
- OPTIONS preflight returns 204 (or 200 with empty body) and the CORS headers.
- A POST from a non-allowlisted origin either omits the CORS header (browser blocks, as today) or returns 403 — your call, but be consistent.
- Existing composer-crx and plugin-crm callers continue to work (they pass an Origin header too; just make sure their origins are allowlisted or the worker tolerates omitted Origin for non-browser callers).

## Done When

- Worker is deployed to production with the CORS support.
- Manual smoke-test from composer.space DevTools console succeeds.
- (Bonus) Ping back the composer-app team with the deploy SHA so they can close the matching tracking issue (`EDGE image service: add CORS headers`).
