//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { encodeAuthHeader, handleAuthChallenge } from '@dxos/edge-client';

//
// VP-auth handshake against an arbitrary edge URL.
//
// The payments-service authenticates with the same verifiable-presentation scheme as the rest of
// DXOS Edge (`Authorization: VerifiablePresentation pb;base64,<...>`). `EdgeHttpClient` performs this
// handshake internally via the protected `_handleUnauthorized`, but it is hard-wired to the configured
// edge URL and the method is not public. Because payments-service runs at a *different* URL we cannot
// reuse `createEdgeHttpClient` as-is, so we reproduce the (small) handshake from the public primitives:
//   - `createEdgeIdentity(client)` -> an `EdgeIdentity` that can `presentCredentials({ challenge })`.
//   - `handleAuthChallenge(response, identity)` -> signs the 401 challenge, returns the encoded presentation.
//   - `encodeAuthHeader(presentation)` -> the `VerifiablePresentation pb;base64,<...>` header value.
//
// TODO(burdon): If/when `EdgeHttpClient` exposes a public, URL-agnostic auth handler (or a
//   `getEdgeAuthHeader(identity, baseUrl)` lands in `@dxos/edge-client`), replace this with it. The
//   logic below is intentionally a thin, faithful copy of `BaseHttpClient._call`'s auth branch.
//

/**
 * Performs the edge VP-auth challenge/response against `baseUrl` and returns the value for the
 * `Authorization` header. The connected identity must be available on the client.
 */
export const getEdgeAuthHeader = async (client: Client, baseUrl: string): Promise<string> => {
  const identity = createEdgeIdentity(client);
  const response = await fetch(new URL('/auth', baseUrl));
  if (response.status !== 401) {
    throw new Error(`Expected 401 challenge from ${baseUrl}/auth, got ${response.status}.`);
  }
  const presentation = await handleAuthChallenge(response, identity);
  return encodeAuthHeader(presentation);
};

/**
 * Returns a `fetch` that injects the edge `Authorization` header on every request. This is used as the
 * *base* fetch for the x402 payment wrapper so that, on the 402 retry, both `Authorization` (edge) and
 * `X-PAYMENT` (x402) headers are present — they are distinct headers and do not conflict.
 */
export const createEdgeAuthedFetch = (client: Client, baseUrl: string): typeof globalThis.fetch => {
  let authHeader: string | undefined;
  return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    authHeader ??= await getEdgeAuthHeader(client, baseUrl);
    // Carry x402's payment header from the retry (v2 uses `payment-signature`) plus Authorization.
    // @x402/fetch builds the retry Request by copying headers off the 402 response, so skip the
    // response-only CORS headers (access-control-*) it drags in — they aren't valid request headers
    // and would break the browser preflight.
    const headers = new Headers();
    const carry = (source?: HeadersInit): void => {
      if (!source) {
        return;
      }
      new Headers(source).forEach((value, key) => {
        if (!key.startsWith('access-control-')) {
          headers.set(key, value);
        }
      });
    };
    if (input instanceof Request) {
      carry(input.headers);
    }
    carry(init?.headers);
    headers.set('Authorization', authHeader);
    return globalThis.fetch(input, { ...init, headers });
  }) as typeof globalThis.fetch;
};
