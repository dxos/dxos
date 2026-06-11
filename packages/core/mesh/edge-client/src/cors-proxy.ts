//
// Copyright 2024 DXOS.org
//

// Lightweight CORS-proxy helpers — intentionally free of heavy transitive
// dependencies so they can be bundled into workerd / browser environments
// without pulling in protobufjs or similar node-only packages.

const LEGACY_CORS_PROXY_URL = 'https://cors-proxy.dxos.workers.dev';

// Matches EDGE_CLIENT_TAG_HEADER from @dxos/protocols.
// Duplicated here to avoid importing the heavy protocols bundle in edge environments.
const EDGE_CLIENT_TAG_HEADER = 'X-DXOS-Client-Tag';

const remapAuthorizationForProxy = (headers: Headers): Headers => {
  const callerAuth = headers.get('Authorization');
  if (callerAuth !== null) {
    headers.delete('Authorization');
    headers.set('X-Cors-Proxy-Authorization', callerAuth);
  }
  return headers;
};

/**
 * Fetch through the legacy standalone open proxy at `cors-proxy.dxos.workers.dev`.
 * TEMPORARY — delete when the authenticated `/proxy/*` route on edge ships.
 */
export const proxyFetchLegacy = (target: URL, init: RequestInit = {}, clientTag?: string): Promise<Response> => {
  const proxyUrl = new URL(`/${target.host}${target.pathname}${target.search}`, LEGACY_CORS_PROXY_URL);
  if (target.protocol === 'http:') {
    proxyUrl.searchParams.set('scheme', 'http');
  }
  const requestHeaders = remapAuthorizationForProxy(new Headers(init.headers ?? undefined));
  if (clientTag) {
    requestHeaders.set(EDGE_CLIENT_TAG_HEADER, clientTag);
  }
  return fetch(proxyUrl, { ...init, headers: requestHeaders });
};
