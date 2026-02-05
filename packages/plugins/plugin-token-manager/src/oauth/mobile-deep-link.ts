//
// Copyright 2025 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Ref from 'effect/Ref';

import { log } from '@dxos/log';
import { type OAuthFlowResult } from '@dxos/protocols';

import { OAUTH_TIMEOUT_MS } from './oauth-flow';

/** Expected host for mobile OAuth deep links. */
export const MOBILE_OAUTH_HOST = 'composer.dxos.org';

/** Expected path prefix for OAuth redirects. */
export const OAUTH_REDIRECT_PATH = '/redirect/oauth';

/** Origin to set for mobile OAuth flow. */
export const MOBILE_OAUTH_ORIGIN = `https://${MOBILE_OAUTH_HOST}`;

/**
 * Parsed OAuth deep link result with accessTokenId always extracted from URL.
 */
export type ParsedOAuthDeepLink = {
  accessTokenId: string;
  result: OAuthFlowResult;
};

/**
 * Parses an OAuth redirect URL and extracts the result.
 * Expected format: https://composer.dxos.org/redirect/oauth?accessTokenId=...&accessToken=...
 */
export const parseOAuthDeepLink = (urlString: string): ParsedOAuthDeepLink | null => {
  try {
    const url = new URL(urlString);

    // Verify this is an OAuth redirect.
    if (url.host !== MOBILE_OAUTH_HOST || !url.pathname.startsWith(OAUTH_REDIRECT_PATH)) {
      return null;
    }

    const accessTokenId = url.searchParams.get('accessTokenId');
    const accessToken = url.searchParams.get('accessToken');
    const error = url.searchParams.get('error');

    if (!accessTokenId) {
      return null;
    }

    if (error) {
      return {
        accessTokenId,
        result: {
          success: false,
          reason: error,
        },
      };
    }

    if (!accessToken) {
      return null;
    }

    return {
      accessTokenId,
      result: {
        success: true,
        accessTokenId,
        accessToken,
      },
    };
  } catch {
    return null;
  }
};

/**
 * Mobile OAuth deep link listener state.
 */
export type MobileDeepLinkListener = {
  /** Stops listening for deep links. */
  unlisten: () => Effect.Effect<void, never>;
  /** Waits for OAuth result for a specific access token ID. */
  waitForResult: (accessTokenId: string, timeoutMs?: number) => Effect.Effect<OAuthFlowResult, Error>;
};

/**
 * Creates a mobile deep link listener for OAuth callbacks.
 * Uses the Tauri deep-link plugin to listen for incoming URLs.
 */
export const createMobileDeepLinkListener = (): Effect.Effect<MobileDeepLinkListener, Error> =>
  Effect.gen(function* () {
    // Store pending OAuth requests with their deferreds.
    const pendingRequests = yield* Ref.make<Map<string, Deferred.Deferred<OAuthFlowResult, Error>>>(new Map());

    // Import the deep-link plugin.
    const { onOpenUrl } = yield* Effect.tryPromise({
      try: () => import('@tauri-apps/plugin-deep-link'),
      catch: (error) => new Error(`Failed to import deep-link plugin: ${error}`),
    });

    // Set up deep link listener.
    log.info('Setting up mobile deep link listener for OAuth callbacks');
    const unlistenPromise = yield* Effect.tryPromise({
      try: () =>
        onOpenUrl((urls: string[]) => {
          log.info('Deep link received', { urls });
          for (const urlString of urls) {
            const parsed = parseOAuthDeepLink(urlString);
            if (parsed) {
              log.info('Parsed OAuth deep link', { accessTokenId: parsed.accessTokenId, success: parsed.result.success });
              // Find and resolve the pending request for this access token ID.
              Effect.runSync(
                Effect.gen(function* () {
                  const requests = yield* Ref.get(pendingRequests);
                  const deferred = requests.get(parsed.accessTokenId);
                  if (deferred) {
                    log.info('Found pending OAuth request, resolving', { accessTokenId: parsed.accessTokenId });
                    yield* Deferred.succeed(deferred, parsed.result);
                    yield* Ref.update(pendingRequests, (map) => {
                      const newMap = new Map(map);
                      newMap.delete(parsed.accessTokenId);
                      return newMap;
                    });
                  } else {
                    log.warn('No pending OAuth request found for deep link', { accessTokenId: parsed.accessTokenId });
                  }
                }),
              );
            } else {
              log.info('Deep link URL not recognized as OAuth redirect', { urlString });
            }
          }
        }),
      catch: (error) => new Error(`Failed to set up deep link listener: ${error}`),
    });

    log.info('Mobile deep link listener ready');

    return {
      unlisten: () =>
        Effect.sync(() => {
          unlistenPromise();
        }),

      waitForResult: (accessTokenId: string, timeoutMs: number = OAUTH_TIMEOUT_MS) =>
        Effect.gen(function* () {
          // Create a deferred for this request.
          const deferred = yield* Deferred.make<OAuthFlowResult, Error>();

          // Register the pending request.
          yield* Ref.update(pendingRequests, (map) => {
            const newMap = new Map(map);
            newMap.set(accessTokenId, deferred);
            return newMap;
          });

          // Wait for result with timeout.
          const result = yield* Effect.race(
            Deferred.await(deferred),
            Effect.sleep(`${timeoutMs} millis`).pipe(
              Effect.flatMap(() => {
                // Clean up on timeout.
                return Ref.update(pendingRequests, (map) => {
                  const newMap = new Map(map);
                  newMap.delete(accessTokenId);
                  return newMap;
                }).pipe(Effect.flatMap(() => Effect.fail(new Error('OAuth flow timed out'))));
              }),
            ),
          );

          return result;
        }),
    };
  });
