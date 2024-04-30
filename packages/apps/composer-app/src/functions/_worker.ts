//
// Copyright 2024 DXOS.org
//

import { type ExportedHandler } from '@cloudflare/workers-types';

import { authMiddleware, type Env } from '@dxos/web-auth';

const handler = authMiddleware({
  cookie: 'COMPOSER-BETA',
  service: 'composer-app-worker',
  redirectUrl: 'https://dxos.org/composer/#beta',
});

/**
 * Cloudflare Pages Functions Advanced mode set-up.
 * https://developers.cloudflare.com/pages/functions/advanced-mode
 * Output _worker.js to <pages_build_output_dir> and deploy via git.
 */
export default {
  fetch: async (request, env, c)=> {
    return handler(request, env, c)
  },
} as ExportedHandler<Env>;
