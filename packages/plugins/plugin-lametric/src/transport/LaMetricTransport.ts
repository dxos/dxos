//
// Copyright 2026 DXOS.org
//

import * as LaMetric from '#protocol';

export type TransportConfig = {
  address?: string;
  /** Defaults to 4343 for https and 8080 for http; the device serves the same path on both. */
  port?: number;
  scheme?: 'http' | 'https';
  appId?: string;
  widgetId?: string;
  accessToken?: string;
};

/** The subset of `fetch` the transports use, so tests need neither Tauri nor a network. */
export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    danger?: { acceptInvalidCerts: boolean; acceptInvalidHostnames: boolean };
  },
) => Promise<{ ok: boolean; status: number }>;

export type LaMetricTransport = {
  readonly kind: 'local' | 'cloud';
  readonly url: string;
  push: (payload: LaMetric.Payload) => Promise<void>;
};

/**
 * Picks where to push, or nothing when the device is not configured.
 *
 * The LAN device is preferred: it avoids a round-trip through LaMetric's servers and works with no
 * internet. Both paths go through the caller's fetch because neither is reachable from a web view —
 * LaMetric's cloud answers a CORS preflight with 405 and sends no `Access-Control-*` header, and the
 * device is plain HTTP or a self-signed certificate on the LAN.
 */
export const selectTransport = (config: TransportConfig, fetchImpl: FetchLike): LaMetricTransport | undefined => {
  const { address, appId, widgetId, accessToken } = config;
  if (!appId || !widgetId || !accessToken) {
    return undefined;
  }

  const scheme = config.scheme ?? 'https';
  const port = config.port ?? (scheme === 'https' ? LaMetric.LOCAL_HTTPS_PORT : LaMetric.LOCAL_HTTP_PORT);
  const url = address
    ? `${scheme}://${address}:${port}${LaMetric.widgetPath(appId, widgetId)}`
    : `${LaMetric.CLOUD_BASE_URL}${LaMetric.widgetPath(appId, widgetId)}`;

  return {
    kind: address ? 'local' : 'cloud',
    url,
    push: async (payload) => {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Access-Token': accessToken },
        body: JSON.stringify(payload),
        // The device presents a self-signed certificate on 4343; plain http and the cloud do not.
        ...(address && scheme === 'https'
          ? { danger: { acceptInvalidCerts: true, acceptInvalidHostnames: true } }
          : {}),
      });
      if (!response.ok) {
        throw new Error(`LaMetric push rejected: ${response.status}`);
      }
    },
  };
};
