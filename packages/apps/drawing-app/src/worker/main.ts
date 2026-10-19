//
// Copyright 2026 DXOS.org
//

import { type ShareEnv, handleShare, isSharePath } from './share.ts';

type Env = ShareEnv & {
  /** The app bundle; only `/api/*` reaches this Worker first (`run_worker_first`), so this serves the rest. */
  readonly ASSETS: { fetch(request: Request): Promise<Response> };
};

// The Workers runtime requires the handler as the module's default export.
export default {
  fetch: (request: Request, env: Env): Promise<Response> => {
    const { pathname } = new URL(request.url);
    if (isSharePath(pathname)) {
      return handleShare(request, env);
    }
    if (pathname.startsWith('/api/')) {
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }
    return env.ASSETS.fetch(request);
  },
};
