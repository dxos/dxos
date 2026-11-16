//
// Copyright 2026 DXOS.org
//

import { SLUG_PATTERN, SOCKET_PATH, SYNC_PATH } from './protocol.ts';
import { type SpaceEnv } from './space-object.ts';

export * from './protocol.ts';
export * from './space-object.ts';

export type Env = SpaceEnv & {
  /** Bound only when a deployment also serves an app; the sync server alone has none. */
  readonly ASSETS?: { fetch(request: Request): Promise<Response> };
};

/** Both transports address the same object: `sync` is one round trip, `socket` stays open. */
const SPACE_PATH = new RegExp(`^/api/space/([^/]+)/(${SYNC_PATH}|${SOCKET_PATH})$`);

/** A client may be served from another origin than the sync server, e.g. a local dev server. */
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const withCors = (response: Response): Response => {
  // A socket upgrade's response cannot be rebuilt, and needs no CORS anyway.
  if (response.status === 101) {
    return response;
  }
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

const LANDING = `echo sync server

POST /api/space/<slug>/sync    one push/pull round trip (JSON)
GET  /api/space/<slug>/socket  WebSocket: pull, push, and live updates

Point the echo-sqlite demo at this origin with VITE_SYNC_URL.
`;

/** Routes `/api/space/<slug>/*` to the slug's Durable Object; everything else is the app, if one is bound. */
export const handleRequest = async (request: Request, env: Env): Promise<Response> => {
  const { pathname } = new URL(request.url);

  const match = SPACE_PATH.exec(pathname);
  if (match) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const slug = match[1];
    if (!SLUG_PATTERN.test(slug)) {
      return withCors(new Response('Invalid slug', { status: 400 }));
    }
    // Routing by slug is what creates a graph on demand: the object exists once addressed.
    const stub = env.SPACE.get(env.SPACE.idFromName(slug));
    return withCors(await stub.fetch(request));
  }

  if (pathname.startsWith('/api/')) {
    return new Response('Not found', { status: 404 });
  }

  if (env.ASSETS) {
    return env.ASSETS.fetch(request);
  }

  return pathname === '/' ? new Response(LANDING) : new Response('Not found', { status: 404 });
};
