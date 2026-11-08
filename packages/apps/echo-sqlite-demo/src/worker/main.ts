//
// Copyright 2026 DXOS.org
//

import { SLUG_PATTERN } from '@dxos/echo-worker';
import { type SpaceEnv, SpaceObject } from '@dxos/echo-worker/worker';

import { type AiEnv, proxyToAnthropic } from './ai.ts';

export { SpaceObject };

type Env = SpaceEnv &
  AiEnv & {
    /** The app bundle. Only `/api/*` reaches the Worker first, so this serves everything else. */
    readonly ASSETS: { fetch(request: Request): Promise<Response> };
  };

/** Both transports address the same object: `sync` is one round trip, `socket` stays open. */
const SPACE_PATH = /^\/api\/space\/([^/]+)\/(sync|socket)$/;

/** The provider proxy, whose path mirrors EDGE's so the client config differs only in origin. */
const AI_PATH = /^\/api\/ai\/provider\/anthropic(\/.*)$/;

// The Workers runtime requires the handler as the module's default export.
export default {
  fetch: (request: Request, env: Env): Promise<Response> => {
    const { pathname } = new URL(request.url);

    const ai = AI_PATH.exec(pathname);
    if (ai) {
      return proxyToAnthropic(request, env, ai[1]);
    }

    const match = SPACE_PATH.exec(pathname);
    if (match) {
      const slug = match[1];
      if (!SLUG_PATTERN.test(slug)) {
        return Promise.resolve(new Response('Invalid slug', { status: 400 }));
      }
      // Routing by slug is what creates a graph on demand: the object exists once addressed.
      const stub = env.SPACE.get(env.SPACE.idFromName(slug));
      return stub.fetch(request);
    }

    if (pathname.startsWith('/api/')) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }

    // `/g/<slug>` is a client route; `not_found_handling` serves the app for it.
    return env.ASSETS.fetch(request);
  },
};
