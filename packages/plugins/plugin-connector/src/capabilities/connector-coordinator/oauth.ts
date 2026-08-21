//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as NativeOAuth from '@dxos/app-toolkit/NativeOAuth';
import { Context as DxContext } from '@dxos/context';
import { type Key } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';

import { ConnectorSpec } from '#types';

/**
 * Parses `postMessage` payload from the OAuth relay into a narrow result.
 * Unknown shapes are ignored so arbitrary messages do not reach domain logic.
 */
export const decodeOAuthMessageData = (
  data: unknown,
):
  | { tag: 'success'; accessTokenId: string; accessToken: string }
  | { tag: 'failure'; reason: string }
  | { tag: 'invalid' } => {
  if (data === null || data === undefined || typeof data !== 'object') {
    return { tag: 'invalid' };
  }
  const record = data as Record<string, unknown>;
  if (record.success === true) {
    const accessTokenId = record.accessTokenId;
    const accessToken = record.accessToken;
    if (typeof accessTokenId === 'string' && typeof accessToken === 'string') {
      return { tag: 'success', accessTokenId, accessToken };
    }
    return { tag: 'invalid' };
  }
  if (record.success === false && typeof record.reason === 'string') {
    return { tag: 'failure', reason: record.reason };
  }
  return { tag: 'invalid' };
};

/**
 * Whether a `postMessage` payload is shaped like an OAuth reply, regardless of whether it decodes.
 *
 * Separates "the relay answered and we rejected it" from "the relay never answered" when reporting a
 * discarded message, without reporting every unrelated message the window receives.
 */
export const isOAuthShapedMessage = (data: unknown): boolean =>
  typeof data === 'object' && data !== null && ('success' in data || 'accessTokenId' in data);

/**
 * Ask EDGE for the provider's authorization URL and send the user to it.
 *
 * Returns once the page is open — completion arrives out of band, at {@link OAUTH_REDIRECT_PATH}.
 *
 * The platforms diverge at the initiate call, not just at the opening. In the browser the app calls
 * EDGE itself and the result comes back through the opener or a redirect to its own origin. On
 * desktop the flow has to run in the system browser (providers refuse embedded webviews), so EDGE
 * must redirect to the shell's loopback server instead — and EDGE takes that target from the
 * request's `Origin`, which only Rust can set. So the shell issues the initiate call too.
 */
export const beginOAuthFlow = (
  edge: EdgeHttpClient,
  spaceId: Key.SpaceId,
  oauth: NonNullable<ConnectorSpec.ConnectorEntry['oauth']>,
  accessTokenId: string,
  loginHint: string | undefined,
): Effect.Effect<void, Error> =>
  NativeOAuth.supportsNativeOAuth()
    ? Effect.tryPromise({
        try: async () =>
          NativeOAuth.startNativeOAuth({
            edgeUrl: edge.baseUrl,
            provider: oauth.provider,
            scopes: [...oauth.scopes],
            spaceId,
            accessTokenId,
            authHeader: await edge.getAuthHeader(),
            ...(loginHint ? { loginHint } : {}),
          }),
        catch: (error) => (error instanceof Error ? error : new Error(String(error))),
      })
    : Effect.gen(function* () {
        const { authUrl } = yield* Effect.tryPromise({
          try: () =>
            edge.initiateOAuthFlow(DxContext.default(), {
              provider: oauth.provider,
              scopes: [...oauth.scopes],
              spaceId,
              accessTokenId,
              ...(loginHint ? { loginHint } : {}),
            }),
          catch: (error) => (error instanceof Error ? error : new Error(String(error))),
        });

        // `useRedirectFlow` connectors (e.g. atproto) get a top-level tab: their auth server
        // nullifies `window.opener` and rejects popups, so the result comes back via a redirect to
        // this origin rather than `postMessage`.
        const authWindow = yield* Effect.sync(() =>
          oauth.useRedirectFlow
            ? window.open(authUrl, '_blank')
            : window.open(authUrl, 'oauthPopup', 'width=500,height=600'),
        );
        // A null return means the popup was blocked. Fail so the caller's pending entry is cleaned
        // up rather than left waiting on a callback that can never arrive.
        if (!authWindow) {
          return yield* Effect.fail(new Error('Unable to open OAuth window (popup blocked?).'));
        }
      });
