//
// Copyright 2024 DXOS.org
//

/**
 * Cloudflare Pages Functions Advanced mode set-up.
 * https://developers.cloudflare.com/pages/functions/advanced-mode
 * Output _worker.js to <pages_build_output_dir> and deploy via git.
 */
const handler: ExportedHandler<{ ASSETS: Fetcher }> = {
  fetch: async (request, env, _context) => {
    const assetsPromise = env.ASSETS.fetch(request);
    let telemetryPromise: Promise<Response> | undefined;

    // Emit telemetry log to Grafana Loki cloud.
    if (env.DX_LOKI_ENDPOINT && env.DX_LOKI_AUTHORIZATION && request.url && request.url.includes('site.webmanifest')) {
      telemetryPromise = fetch(env.DX_LOKI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: env.DX_LOKI_AUTHORIZATION
        },
        body: JSON.stringify({ 
          streams: [
            {
              stream: {
                "service_name": "composer",
                "environment": env.ENVIRONMENT ?? undefined
              },
              values: [[String(Date.now() * 1e6), "Fetch app"]]
            }
          ] 
        })
      }).then(async (response) => {
        if (!response.ok) {
          console.log("LOKI telemetry fetch failed:", await response.text());
        }
      }).catch((error) => console.error("LOKI telemetry fetch error:", error));
    }

    // Wait for both promises to complete.
    await Promise.all([assetsPromise, telemetryPromise]);

    return assetsPromise;
  },
};

export default handler;
