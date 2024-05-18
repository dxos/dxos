//
// Copyright 2024 DXOS.org
//

import { authMiddleware, type Env } from '@dxos/web-auth';

const authHandler = authMiddleware({
  cookie: 'COMPOSER-BETA',
  service: 'composer-worker',
  redirectUrl: 'https://dxos.org/composer/#beta',
});

/**
 * Cloudflare Pages Functions Advanced mode set-up.
 * https://developers.cloudflare.com/pages/functions/advanced-mode
 * Output _worker.js to <pages_build_output_dir> and deploy via git.
 */
const handler: ExportedHandler<Env> = {
  fetch: process.env.DX_AUTH
    ? authHandler
    : async (request, env) => {
        return env.ASSETS.fetch(request);
      },
};

export default handler;
