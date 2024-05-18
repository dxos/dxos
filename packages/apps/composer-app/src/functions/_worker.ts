//
// Copyright 2024 DXOS.org
//

import { authMiddleware, type Env } from '@dxos/web-auth';

const handler = authMiddleware({
  cookie: 'COMPOSER-BETA',
  service: 'composer-worker',
  redirectUrl: 'https://dxos.org/composer/#beta',
});

/**
 * Cloudflare Pages Functions Advanced mode set-up.
 * https://developers.cloudflare.com/pages/functions/advanced-mode
 * Output _worker.js to <pages_build_output_dir> and deploy via git.
 */
export default {
  fetch: process.env.DX_AUTH
    ? async (request, env, c) => {
        return handler(request, env, c);
      }
    : undefined,
} as ExportedHandler<Env>;
