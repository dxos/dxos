//
// Copyright 2026 DXOS.org
//

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
    // OAuth uses custom scheme (composer://) via ASWebAuthenticationSession, so exclude /redirect/oauth.
    if (url.pathname === '/.well-known/apple-app-site-association') {
      return Response.json(
        {
          applinks: {
            apps: [],
            details: [
              {
                appID: `${env.APPLE_TEAM_ID}.org.dxos.composer`,
                paths: ['/*'],
                exclude: ['/redirect/oauth*'],
              },
            ],
          },
        },
        { headers: { 'Cache-Control': 'public, max-age=3600' } },
      );
    }

    // OAuth redirect - fallback bridge from HTTPS to custom scheme.
    // Primary flow: Edge redirects directly to composer:// when nativeAppRedirect=true.
    // This fallback handles the case where Edge doesn't support nativeAppRedirect yet.
    if (url.pathname.startsWith('/redirect/oauth')) {
      const customSchemeUrl = `composer://oauth/callback${url.search}`;
      return Response.redirect(customSchemeUrl, 302);
    }

    // Everything else redirects to composer.space.
    return Response.redirect('https://composer.space' + url.pathname + url.search, 302);
  },
};
