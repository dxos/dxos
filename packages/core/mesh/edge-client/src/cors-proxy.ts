//
// Copyright 2024 DXOS.org
//

// Lightweight CORS-proxy helpers — intentionally free of heavy transitive
// dependencies so they can be bundled into workerd / browser environments
// without pulling in protobufjs or similar node-only packages.

const LEGACY_CORS_PROXY_URL = 'https://edge.network/cors';

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
 * Fetch through the legacy open proxy, reached at EDGE's `/cors` prefix.
 * TEMPORARY — delete when the authenticated `/proxy/*` route on edge ships.
 */
export const proxyFetchLegacy = (target: URL, init: RequestInit = {}, clientTag?: string): Promise<Response> => {
  // Appended to the base path rather than resolved as an absolute path: `new URL('/a', base)` would
  // discard the base's own `/cors` prefix and address edge's root instead.
  const proxyUrl = new URL(`${LEGACY_CORS_PROXY_URL}/${target.host}${target.pathname}${target.search}`);
  if (target.protocol === 'http:') {
    proxyUrl.searchParams.set('scheme', 'http');
  }
  const requestHeaders = remapAuthorizationForProxy(new Headers(init.headers ?? undefined));
  if (clientTag) {
    requestHeaders.set(EDGE_CLIENT_TAG_HEADER, clientTag);
  }
  return fetch(proxyUrl, { ...init, headers: requestHeaders });
};
