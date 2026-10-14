//
// Copyright 2026 DXOS.org
//

import { createReadStream, existsSync } from 'node:fs';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import path from 'node:path';

/** Requests and body bytes per endpoint; bodies are counted and dropped, never stored. */
export type TelemetryTraffic = Record<string, { requests: number; bytes: number }>;

export type TelemetrySink = {
  port: number;
  traffic: () => TelemetryTraffic;
  close: () => Promise<void>;
};

export type TelemetrySinkOptions = {
  port: number;
  /** posthog-js's `dist`, which holds the extensions (recorder, exception capture) the SDK loads on demand. */
  posthogAssets: string;
};

/**
 * PostHog's remote config with the features the app's project turns on: session replay with
 * console logs, and exception autocapture. Without it the SDK records nothing.
 */
const remoteConfig = (token: string) => ({
  token,
  supportedCompression: ['gzip', 'gzip-js'],
  hasFeatureFlags: false,
  autocapture_opt_out: false,
  autocaptureExceptions: true,
  capturePerformance: { network_timing: true, web_vitals: false },
  analytics: { endpoint: '/i/v0/e/' },
  elementsChainAsString: true,
  sessionRecording: {
    endpoint: '/s/',
    consoleLogRecordingEnabled: true,
    recorderVersion: 'v2',
    sampleRate: null,
    minimumDurationMilliseconds: null,
    linkedFlag: null,
    networkPayloadCapture: null,
    urlTriggers: [],
    urlBlocklist: [],
    eventTriggers: [],
  },
  heatmaps: false,
  surveys: false,
  defaultIdentifiedOnly: true,
  siteApps: [],
});

/** Endpoint names a traffic row is keyed by: no query string, no project token. */
const endpointOf = (url: string): string => {
  const pathname = url.split('?')[0];
  return pathname.replace(/^\/array\/[^/]+\//, '/array/:token/');
};

const cors = (request: IncomingMessage, response: ServerResponse) => {
  response.setHeader('access-control-allow-origin', request.headers.origin ?? '*');
  response.setHeader('access-control-allow-credentials', 'true');
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  response.setHeader('access-control-allow-headers', request.headers['access-control-request-headers'] ?? '*');
};

/**
 * A loopback stand-in for PostHog and the OTel collector, so a run measures the app with its
 * observability on, as shipped, while nothing it captures leaves the machine or is kept.
 */
export const startTelemetrySink = async ({ port, posthogAssets }: TelemetrySinkOptions): Promise<TelemetrySink> => {
  const traffic: TelemetryTraffic = {};
  const count = (endpoint: string, bytes: number) => {
    const row = (traffic[endpoint] ??= { requests: 0, bytes: 0 });
    row.requests += 1;
    row.bytes += bytes;
  };
  const server = createServer((request, response) => {
    cors(request, response);
    const url = request.url ?? '/';
    const endpoint = endpointOf(url);
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }
    let bytes = 0;
    request.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
    });
    request.on('end', () => {
      count(endpoint, bytes);
      const config = /^\/array\/([^/]+)\/config(\.js)?$/.exec(url.split('?')[0]);
      if (config) {
        const body = remoteConfig(config[1]);
        if (config[2]) {
          response.writeHead(200, { 'content-type': 'application/javascript' });
          response.end(
            `window._POSTHOG_REMOTE_CONFIG=window._POSTHOG_REMOTE_CONFIG||{};window._POSTHOG_REMOTE_CONFIG[${JSON.stringify(config[1])}]=${JSON.stringify({ config: body, siteApps: [] })};`,
          );
        } else {
          response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
        }
        return;
      }
      if (endpoint.startsWith('/flags')) {
        response
          .writeHead(200, { 'content-type': 'application/json' })
          .end(
            JSON.stringify({ flags: {}, featureFlags: {}, featureFlagPayloads: {}, errorsWhileComputingFlags: false }),
          );
        return;
      }
      const asset = /^\/static\/(?:[\d.]+\/)?([\w.-]+\.js)$/.exec(endpoint)?.[1];
      if (asset) {
        const file = path.join(posthogAssets, asset);
        if (existsSync(file)) {
          response.writeHead(200, { 'content-type': 'application/javascript' });
          createReadStream(file).pipe(response);
        } else {
          response.writeHead(404).end();
        }
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json' }).end('{"status":1}');
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return {
    port,
    traffic: () => structuredClone(traffic),
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};
