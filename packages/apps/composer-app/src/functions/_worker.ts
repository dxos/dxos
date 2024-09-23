//
// Copyright 2024 DXOS.org
//

const sendTelemetryEvent = async (env, event: string, url) => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Timeout waiting for LOKI telemetry response"));
    }, 2000);

    if (typeof timeoutId === 'object' && 'unref' in timeoutId) {
      timeoutId.unref();
    }
  });

  const requestPromise = fetch(env.DX_LOKI_ENDPOINT, {
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
            "environment": env.ENVIRONMENT ?? undefined,
            url: url ?? undefined
          },
          values: [[String(Date.now() * 1e6), event]]
        }
      ] 
    })
  }).then(async (response) => {
    if (!response.ok) {
      console.log("LOKI telemetry fetch failed:", await response.text());
    }
  });
  
  return Promise.race([timeoutPromise, requestPromise])
            .catch((error) => console.error("LOKI telemetry fetch error:", error))
            .finally(() => clearTimeout(timeoutId));
}

/**
 * Cloudflare Pages Functions Advanced mode set-up.
 * https://developers.cloudflare.com/pages/functions/advanced-mode
 * Output _worker.js to <pages_build_output_dir> and deploy via git.
 */
const handler: ExportedHandler<{ ASSETS: Fetcher }> = {
  fetch: async (request, env, _context) => {
    const assetsPromise = env.ASSETS.fetch(request);
    let telemetryPromise: Promise<any> | undefined;

    // Emit telemetry log to Grafana Loki cloud.
    if (env.DX_LOKI_ENDPOINT && env.DX_LOKI_AUTHORIZATION && request.url && request.url.includes('site.webmanifest')) {
      telemetryPromise = sendTelemetryEvent(env, 'Fetch app', request.url);
    }

    // Note: Telemetry promise should be awaited. Otherwise, it will be cancelled when the function returns.
    //       To not block the response if telemetry fails, we add timeout to telemetry promise.
    await Promise.all([assetsPromise, telemetryPromise]);

    return assetsPromise;
  },
};

export default handler;
