//
// Copyright 2026 DXOS.org
//

import { type SpaceEnv, SpaceObject } from './space-object.ts';

export { SpaceObject };

type Env = SpaceEnv & {
  /** The app bundle. Only `/api/*` reaches the Worker first, so this serves everything else. */
  readonly ASSETS: { fetch(request: Request): Promise<Response> };
};

const SPACE_PATH = /^\/api\/space\/([A-Z2-7]{32,33})$/;

// The Workers runtime requires the handler as the module's default export.
export default {
  fetch: (request: Request, env: Env): Promise<Response> => {
    const { pathname } = new URL(request.url);

    const match = SPACE_PATH.exec(pathname);
    if (match) {
      // Route by space id, so each space gets its own single-writer object.
      const stub = env.SPACE.get(env.SPACE.idFromName(match[1]));
      return stub.fetch(request);
    }

    if (pathname.startsWith('/api/')) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }

    return env.ASSETS.fetch(request);
  },
};
