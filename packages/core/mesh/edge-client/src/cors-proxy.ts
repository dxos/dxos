//
// Copyright 2024 DXOS.org
//

// Lightweight CORS-proxy helpers — intentionally free of heavy transitive
// dependencies so they can be bundled into workerd / browser environments
// without pulling in protobufjs or similar node-only packages.

// The EDGE entrypoint's `/cors-proxy` prefix. Still the same open proxy worker -- what changed is the
// address: every service is reached as `<env>.dxos.network/<service>`, so nothing here holds a
// per-service hostname. Pinned to production because this module deliberately has no config access
// (it is bundled into workerd and browser contexts that have no client).
const CORS_PROXY_URL = 'https://dxos.network/cors-proxy';

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
 * Fetch through the open CORS proxy at `<edge>/cors-proxy/<host>/<path>`.
 *
 * @deprecated TODO(burdon): Delete when the authenticated `/proxy/*` route on edge ships. Open proxy:
 * any caller, any target host, no credential.
 */
export const proxyFetchLegacy = (target: URL, init: RequestInit = {}, clientTag?: string): Promise<Response> => {
  // Concatenated, not `new URL(path, base)`: an absolute path would replace the `/cors-proxy` prefix.
  const proxyUrl = new URL(`${CORS_PROXY_URL}/${target.host}${target.pathname}${target.search}`);
  if (target.protocol === 'http:') {
    proxyUrl.searchParams.set('scheme', 'http');
  }
  const requestHeaders = remapAuthorizationForProxy(new Headers(init.headers ?? undefined));
  if (clientTag) {
    requestHeaders.set(EDGE_CLIENT_TAG_HEADER, clientTag);
  }
  return fetch(proxyUrl, { ...init, headers: requestHeaders });
};
