//
// Copyright 2026 DXOS.org
//

import * as LaMetric from '#protocol';

export type TransportConfig = {
  /** IP or hostname of the device on this network. Its presence selects local push. */
  address?: string;
  /** Defaults to 4343 for https and 8080 for http; the device serves the same API on both. */
  port?: number;
  scheme?: 'http' | 'https';
  /** Local push: the device API key, used as the password of a `dev` Basic credential. */
  apiKey?: string;
  /**
   * The "My Data (DIY)" widget instance for local push, or the widget of a published app for cloud
   * push. Discovered from the device rather than typed in — see {@link discoverWidgetId}.
   */
  widgetId?: string;
  /** Cloud push only: the published indicator app's id and token. */
  appId?: string;
  accessToken?: string;
};

/** The subset of `fetch` the transports use, so tests need neither Tauri nor a network. */
export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    danger?: { acceptInvalidCerts: boolean; acceptInvalidHostnames: boolean };
  },
) => Promise<{ ok: boolean; status: number; json?: () => Promise<unknown> }>;

export type LaMetricTransport = {
  readonly kind: 'local' | 'cloud';
  readonly url: string;
  push: (payload: LaMetric.Payload) => Promise<void>;
};

/** The device presents a self-signed certificate on 4343; plain http and the cloud do not. */
const dangerFor = (scheme: string) =>
  scheme === 'https' ? { danger: { acceptInvalidCerts: true, acceptInvalidHostnames: true } } : {};

const basic = (apiKey: string) => `Basic ${btoa(`dev:${apiKey}`)}`;

const origin = (config: TransportConfig): { url: string; scheme: string } => {
  const scheme = config.scheme ?? 'https';
  const port = config.port ?? (scheme === 'https' ? LaMetric.LOCAL_HTTPS_PORT : LaMetric.LOCAL_HTTP_PORT);
  return { url: `${scheme}://${config.address}:${port}`, scheme };
};

/**
 * Picks where to push, or nothing when the device is not configured.
 *
 * The two paths are **not** the same request at different hosts, which is easy to assume and wrong:
 * local push goes to the stock "My Data (DIY)" app over the device's own v2 API with Basic auth,
 * while cloud push goes to a published indicator app over the v1 developer API with an access token.
 * Only the body is shared.
 *
 * Local is preferred: it avoids a round-trip through LaMetric's servers and works with no internet.
 * Both go through the caller's fetch because neither is reachable from a web view — the cloud answers
 * a CORS preflight with 405, and the device is plain HTTP or a self-signed certificate on the LAN.
 */
export const selectTransport = (config: TransportConfig, fetchImpl: FetchLike): LaMetricTransport | undefined => {
  const { address, apiKey, widgetId, appId, accessToken } = config;
  if (!widgetId) {
    return undefined;
  }

  if (address) {
    if (!apiKey) {
      return undefined;
    }
    const { url: base, scheme } = origin(config);
    const url = `${base}${LaMetric.localWidgetPath(widgetId)}`;
    return {
      kind: 'local',
      url,
      push: async (payload) => {
        const response = await fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': basic(apiKey) },
          body: JSON.stringify(payload),
          ...dangerFor(scheme),
        });
        if (!response.ok) {
          throw new Error(`LaMetric push rejected: ${response.status}`);
        }
      },
    };
  }

  if (!appId || !accessToken) {
    return undefined;
  }
  const url = `${LaMetric.CLOUD_BASE_URL}${LaMetric.cloudWidgetPath(appId, widgetId)}`;
  return {
    kind: 'cloud',
    url,
    push: async (payload) => {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Access-Token': accessToken },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`LaMetric push rejected: ${response.status}`);
      }
    },
  };
};

/** Shape of the device's app list that matters here; every other field is ignored. */
type DeviceApps = Record<string, { package?: string; widgets?: Record<string, unknown> }>;

/**
 * Finds the "My Data (DIY)" widget instance on the device.
 *
 * Necessary rather than convenient: the UUID identifies one installation of the stock app and is not
 * shown anywhere in LaMetric's apps or portal, so it can only come from the device itself.
 */
export const discoverWidgetId = async (config: TransportConfig, fetchImpl: FetchLike): Promise<string | undefined> => {
  const { address, apiKey } = config;
  if (!address || !apiKey) {
    return undefined;
  }

  const { url: base, scheme } = origin(config);
  const response = await fetchImpl(`${base}${LaMetric.DEVICE_APPS_PATH}`, {
    method: 'GET',
    headers: { Authorization: basic(apiKey) },
    ...dangerFor(scheme),
  });
  if (!response.ok || !response.json) {
    return undefined;
  }

  const apps = (await response.json()) as DeviceApps;
  const diy = Object.values(apps ?? {}).find((app) => app?.package === LaMetric.DIY_PACKAGE);
  return Object.keys(diy?.widgets ?? {})[0];
};
