//
// Copyright 2026 DXOS.org
//

// Serves the codebase explorer from where `deus explore --publish` (and every `deus push` after
// it) uploads it: `ORIGIN` is the public URL of a remote's `site/` folder. Responses are cached
// briefly, so a push shows up within a minute.

const MAX_AGE = 60;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const cache = caches.default;
    const key = new Request(`${url.origin}${path}`);
    const cached = await cache.match(key);
    if (cached) {
      return cached;
    }
    const upstream = await fetch(`${env.ORIGIN.replace(/\/$/, '')}${path}`);
    const response = new Response(upstream.body, upstream);
    response.headers.set('cache-control', `public, max-age=${MAX_AGE}`);
    if (upstream.ok) {
      ctx.waitUntil(cache.put(key, response.clone()));
    }
    return response;
  },
};
