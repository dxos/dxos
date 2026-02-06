//
// Copyright 2026 DXOS.org
//

/**
 * Temporary Cloudflare Worker for composer.dxos.org.
 *
 * This worker serves iOS/Android app verification files (AASA, assetlinks.json) and
 * redirects all other requests to composer.space.
 *
 * TODO(wittjosiah): Consolidate into composer-app worker.
 *   This is a temporary separate deployment. The long-term solution is to:
 *   1. Add this logic to packages/apps/composer-app/src/functions/_worker.ts
 *   2. Check request hostname to route composer.dxos.org vs composer.space
 *   3. Add composer.dxos.org as a custom domain in Cloudflare Pages
 *   4. Delete this package (packages/apps/composer-dxos-org)
 *   This consolidation is blocked until we can deploy to composer.space production.
 */

export interface Env {
  APPLE_TEAM_ID: string;
  // ANDROID_SHA256_FINGERPRINTS: string; // JSON array - uncomment when enabling Android support
}

export default {
  fetch: async (request: Request, env: Env): Promise<Response> => {
    const url = new URL(request.url);

    // Android App Links verification.
    // Enables Android to verify this domain for deep linking to the Composer app.
    // To enable:
    //   1. Uncomment ANDROID_SHA256_FINGERPRINTS in Env interface above
    //   2. Uncomment the block below
    //   3. Set ANDROID_SHA256_FINGERPRINTS secret in Cloudflare (JSON array of SHA256 fingerprints)
    //   4. Fingerprints come from: keytool -list -v -keystore <keystore> | grep SHA256
    //
    // if (url.pathname === '/.well-known/assetlinks.json') {
    //   const fingerprints = JSON.parse(env.ANDROID_SHA256_FINGERPRINTS || '[]');
    //   return Response.json(
    //     [
    //       {
    //         relation: ['delegate_permission/common.handle_all_urls'],
    //         target: {
    //           namespace: 'android_app',
    //           package_name: 'org.dxos.composer',
    //           sha256_cert_fingerprints: fingerprints,
    //         },
    //       },
    //     ],
    //     { headers: { 'Cache-Control': 'public, max-age=3600' } },
    //   );
    // }

    // iOS Universal Links verification.
    if (url.pathname === '/.well-known/apple-app-site-association') {
      return Response.json(
        {
          applinks: {
            apps: [],
            details: [
              {
                appID: `${env.APPLE_TEAM_ID}.org.dxos.composer`,
                paths: ['/*'],
              },
            ],
          },
        },
        { headers: { 'Cache-Control': 'public, max-age=3600' } },
      );
    }

    // Everything else redirects to composer.space.
    return Response.redirect('https://composer.space' + url.pathname + url.search, 302);
  },
};
