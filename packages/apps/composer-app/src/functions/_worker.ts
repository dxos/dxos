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
const handler: ExportedHandler<Env & { DX_AUTH: any }> = {
  fetch: async (request, env, context) => {
    const hostname = new URL(request.url).hostname;
    // Disable auth for *.dxos.org legacy deployments & main branch preview.
    const auth = hostname.endsWith('dxos.org') || hostname === 'main.composer.space' ? false : Boolean(env.DX_AUTH);
    return auth ? authHandler(request, env, context) : env.ASSETS.fetch(request);
  },
};

export default handler;
