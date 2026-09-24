//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import * as McpOAuth from './McpOAuth.ts';
import * as McpToolkit from './McpToolkit.ts';
import { type TestServer, startTestServer } from './testing/test-server.ts';

const REDIRECT_URL = 'http://localhost:4173/mcp-oauth-callback.html';

/** The store an ECHO object provides in the app, in memory. */
const makeStore = (): McpOAuth.Store & {
  state: { registration?: McpOAuth.Registration; tokens?: McpOAuth.Tokens };
} => {
  const state: { registration?: McpOAuth.Registration; tokens?: McpOAuth.Tokens } = {};
  return {
    state,
    registration: () => state.registration,
    saveRegistration: (registration) => {
      state.registration = registration;
      state.tokens = undefined;
    },
    tokens: () => state.tokens,
    saveTokens: (tokens) => {
      state.tokens = tokens;
    },
  };
};

describe('McpOAuth', () => {
  let server: TestServer;
  beforeAll(async () => {
    server = await startTestServer();
  });
  afterAll(async () => {
    await server.close();
  });

  test('an unauthenticated connection is reported as unauthorized', async ({ expect }) => {
    const error = await EffectEx.runPromise(
      McpToolkit.probe({ url: server.urls.oauth, protocol: 'http' }).pipe(Effect.flip),
    );
    expect(error.unauthorized).toBe(true);

    const keyError = await EffectEx.runPromise(
      McpToolkit.probe({ url: server.urls.key, protocol: 'http', apiKey: 'wrong' }).pipe(Effect.flip),
    );
    expect(keyError.unauthorized).toBe(true);
  });

  test('an API key is sent as a Bearer token', async ({ expect }) => {
    const { tools } = await EffectEx.runPromise(
      McpToolkit.probe({ url: server.urls.key, protocol: 'http', apiKey: server.apiKey }),
    );
    expect(tools).toEqual(['get_weather']);
  });

  test('sign-in registers a client, exchanges the code, and the agent refreshes without the user', async ({
    expect,
  }) => {
    const store = makeStore();

    // Interactive sign-in, as the browser runs it.
    let authorizationUrl: URL | undefined;
    const provider = McpOAuth.makeProvider({
      store,
      redirectUrl: REDIRECT_URL,
      onAuthorize: (url) => {
        authorizationUrl = url;
      },
    });
    const result = await EffectEx.runPromise(McpOAuth.authorize(provider, server.urls.oauth));
    expect(result).toBe('REDIRECT');
    expect(store.state.registration?.clientId).toBeDefined();
    expect(authorizationUrl?.searchParams.get('code_challenge_method')).toBe('S256');

    invariant(authorizationUrl);
    const redirect = await server.approve(authorizationUrl.href);
    expect(redirect.origin + redirect.pathname).toBe(REDIRECT_URL);
    expect(redirect.searchParams.get('state')).toBe(provider.pendingState);
    const code = redirect.searchParams.get('code');
    invariant(code);
    await EffectEx.runPromise(McpOAuth.completeAuthorization(provider, server.urls.oauth, code));
    expect(store.state.tokens?.accessToken).toBeDefined();
    expect(store.state.tokens?.expiresAt).toBeGreaterThan(Date.now());

    // The agent: no redirect URL, just the stored state.
    const agentProvider = () => McpOAuth.makeProvider({ store });
    const { tools } = await EffectEx.runPromise(
      McpToolkit.probe({ url: server.urls.oauth, protocol: 'http', authProvider: agentProvider() }),
    );
    expect(tools).toEqual(['get_weather']);

    // An expired access token is refreshed on the 401 and the new tokens are stored.
    const previous = store.state.tokens?.accessToken;
    server.expireAccessTokens();
    await EffectEx.runPromise(
      McpToolkit.probe({ url: server.urls.oauth, protocol: 'http', authProvider: agentProvider() }),
    );
    expect(server.stats.refreshes).toBe(1);
    expect(store.state.tokens?.accessToken).not.toBe(previous);

    // Once the refresh token is gone too, the agent cannot sign in on its own and says so.
    server.expireAccessTokens();
    invariant(store.state.tokens);
    store.saveTokens({ ...store.state.tokens, refreshToken: undefined });
    const error = await EffectEx.runPromise(
      McpToolkit.probe({ url: server.urls.oauth, protocol: 'http', authProvider: agentProvider() }).pipe(Effect.flip),
    );
    expect(error.unauthorized).toBe(true);
    expect(server.stats.registrations).toBe(1);
  });
});
