//
// Copyright 2024 DXOS.org
//

/**
 * Cloudflare Pages Functions Advanced mode set-up.
 * https://developers.cloudflare.com/pages/functions/advanced-mode
 * Output _worker.js to <pages_build_output_dir> and deploy via git.
 */
const handler: ExportedHandler<{ ASSETS: Fetcher }> = {
  // NOTE: This is just a pass-through. Leaving the worker setup here for future use.
  fetch: async (request, env, _context) => {
    return env.ASSETS.fetch(request);
  },
};

export default handler;
