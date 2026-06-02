//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Layer from 'effect/Layer';

import { proxyFetchLegacy } from '@dxos/edge-client';

/**
 * Discord's REST docs say a valid bot User-Agent is required and the format is
 * `DiscordBot ($url, $versionNumber)`. Without it, requests to guild-scoped
 * endpoints intermittently 403 with the unhelpful `40333 internal network
 * error` code (other endpoints like `/users/@me/guilds` are more permissive,
 * which is why bot identity / guild-list calls succeed without it but the
 * `/guilds/{id}/channels` lookup fails). Set it via the proxy's override
 * prefix because browsers refuse to let JS set `User-Agent` directly.
 */
const USER_AGENT_OVERRIDE_HEADER = 'X-Cors-Proxy-User-Agent';
const DISCORD_BOT_USER_AGENT = 'DiscordBot (https://dxos.org, 0.1.0)';

export interface EdgeProxyHttpClientOptions {
  /**
   * Authorization header token kind.
   *
   * dfx always writes `Bot <token>` regardless of the credential type. When
   * `'Bearer'` is specified, this layer rewrites that prefix to `Bearer ` so
   * user OAuth tokens are transmitted correctly.
   *
   * TODO(wittjosiah): Submit a PR to dfx to support bearer tokens natively so
   * this rewrite is no longer necessary.
   * https://github.com/tim-smart/dfx
   */
  tokenKind?: 'Bot' | 'Bearer';
}

/**
 * Build an `@effect/platform` HttpClient layer that routes every request
 * through the integration proxy.
 *
 * Implementation note: the @effect/platform fetch client reads the `fetch`
 * function from its `FetchHttpClient.Fetch` context tag, falling back to
 * `globalThis.fetch`. Providing a layer that supplies a custom `Fetch` lets
 * us reuse the entire `FetchHttpClient.layer` machinery (request encoding,
 * response decoding, timeouts, retry composition) and only swap how the
 * underlying network call is made.
 *
 * Discord (and any other integration upstream that doesn't permit browser
 * CORS) only works in a browser via the proxy; this layer is the single
 * swap-point that makes that transparent to operation handlers.
 *
 * TEMPORARY: routes through `proxyFetchLegacy` (the open standalone
 * cors-proxy worker). When the authenticated `/proxy/*` route on the main
 * edge worker ships (https://github.com/dxos/edge/pull/576), this layer
 * should be re-parameterised on `EdgeHttpClient` and route through
 * `edgeClient.proxyFetch` so each request is signed with the caller's
 * verifiable presentation.
 */
export const makeEdgeProxyHttpClientLayer = (
  options?: EdgeProxyHttpClientOptions,
): Layer.Layer<FetchHttpClient.Fetch> =>
  Layer.succeed(FetchHttpClient.Fetch, ((input, init) => {
    const url = input instanceof URL ? input : new URL(typeof input === 'string' ? input : input.url);
    // Seed from the Request's own headers first (caller used `fetch(new Request(...))`),
    // then overlay anything in `init.headers`. dfx currently always uses string/URL +
    // init, but the wrapper is typed as `typeof fetch` so we honor both shapes.
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers ?? undefined).forEach((value, key) => {
      headers.set(key, value);
    });
    if (options?.tokenKind === 'Bearer') {
      const auth = headers.get('Authorization');
      if (auth?.startsWith('Bot ')) {
        headers.set('Authorization', `Bearer ${auth.slice(4)}`);
      }
    }
    if (!headers.has(USER_AGENT_OVERRIDE_HEADER)) {
      headers.set(USER_AGENT_OVERRIDE_HEADER, DISCORD_BOT_USER_AGENT);
    }
    return proxyFetchLegacy(url, { ...init, headers });
  }) as typeof fetch);
