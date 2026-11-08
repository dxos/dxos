//
// Copyright 2026 DXOS.org
//

import { SLUG_PATTERN } from '../protocol.ts';
import { type SpaceEnv, SpaceObject } from './space-object.ts';

export { SpaceObject };

type Env = SpaceEnv & {
  /** The app bundle. Only `/api/*` reaches the Worker first, so this serves everything else. */
  readonly ASSETS: { fetch(request: Request): Promise<Response> };
};

const SYNC_PATH = /^\/api\/space\/([^/]+)\/sync$/;

// The Workers runtime requires the handler as the module's default export.
export default {
  fetch: (request: Request, env: Env): Promise<Response> => {
    const { pathname } = new URL(request.url);

    const match = SYNC_PATH.exec(pathname);
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
