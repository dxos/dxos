//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type OAuthFlowResult } from '@dxos/protocols';

import { OAUTH_TIMEOUT_MS, type OAuthInitiator, type OAuthServer, type OAuthServerProvider } from './oauth-flow';

/**
 * Opens a URL in the system's default browser using Tauri shell.
 */
export const openTauriBrowser = (url: string): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: async () => {
      const { open } = await import('@tauri-apps/plugin-shell');
      return open(url);
    },
    catch: (error) => new Error(`Failed to open browser: ${error}`),
  });

/**
 * Starts the OAuth server via Tauri command.
 */
const startServer = (): Effect.Effect<number, Error> =>
  Effect.tryPromise({
    try: async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<number>('start_oauth_server');
    },
    catch: (error) => new Error(`Failed to start OAuth server: ${error}`),
  });

/**
 * Stops the OAuth server via Tauri command.
 */
const stopServer = (): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke<void>('stop_oauth_server');
    },
    catch: (error) => new Error(`Failed to stop OAuth server: ${error}`),
  });

/**
 * Gets OAuth result for a specific access token ID via Tauri command.
 */
const getOAuthResult = (accessTokenId: string): Effect.Effect<OAuthFlowResult | null, Error> =>
  Effect.tryPromise({
    try: async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<OAuthFlowResult | null>('get_oauth_result', { accessTokenId });
    },
    catch: (error) => new Error(`Failed to get OAuth result: ${error}`),
  });

/**
 * Polls for OAuth result until available or timeout.
 */
const pollOAuthResult = (
  accessTokenId: string,
  timeoutMs: number = OAUTH_TIMEOUT_MS,
): Effect.Effect<OAuthFlowResult, Error> =>
  Effect.race(
    Effect.gen(function* () {
      while (true) {
        const result = yield* getOAuthResult(accessTokenId);
        if (result) {
          return result;
        }
        yield* Effect.sleep('500 millis');
      }
    }),
    Effect.sleep(`${timeoutMs} millis`).pipe(Effect.flatMap(() => Effect.fail(new Error('OAuth flow timed out')))),
  );

/**
 * Creates a Tauri-based OAuth server provider.
 * Uses Tauri commands to manage the Rust HTTP server.
 */
export const createTauriServerProvider = (): OAuthServerProvider => ({
  start: () =>
    Effect.gen(function* () {
      const port = yield* startServer();

      const server: OAuthServer = {
        port,
        stop: () => stopServer(),
        waitForResult: (accessTokenId: string, timeoutMs?: number) => pollOAuthResult(accessTokenId, timeoutMs),
      };

      return server;
    }),
});

/**
 * Initiates OAuth flow via Tauri command.
 * Makes the HTTP request from Rust where we can set the Origin header properly.
 */
export const createTauriOAuthInitiator = (): OAuthInitiator => ({
  initiate: (params) =>
    Effect.tryPromise({
      try: async () => {
        const { invoke } = await import('@tauri-apps/api/core');
        return invoke<string>('initiate_oauth_flow', {
          edgeUrl: params.edgeUrl,
          provider: params.provider,
          scopes: params.scopes,
          spaceId: params.spaceId,
          accessTokenId: params.accessTokenId,
          redirectOrigin: params.redirectOrigin,
          authHeader: params.authHeader,
        });
      },
      catch: (error) => new Error(`Failed to initiate OAuth flow: ${error}`),
    }),
});
