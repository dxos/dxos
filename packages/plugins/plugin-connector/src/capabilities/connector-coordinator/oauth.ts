//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Context as DxContext } from '@dxos/context';
import { type Key } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';

import { type ConnectorEntry } from '#types';

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

export const initiateOAuthFlow = (
  edge: EdgeHttpClient,
  spaceId: Key.SpaceId,
  oauth: NonNullable<ConnectorEntry['oauth']>,
  accessTokenId: string,
  loginHint: string | undefined,
): Effect.Effect<{ authUrl: string }, Error> =>
  Effect.tryPromise({
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

export const openOAuthPopupWindow = (authUrl: string): Effect.Effect<void, never> =>
  Effect.sync(() => {
    window.open(authUrl, 'oauthPopup', 'width=500,height=600');
  });

/**
 * Open the auth URL in a new top-level browser tab. Used for
 * `useRedirectFlow` connectors (e.g. atproto) where the auth server
 * nullifies `window.opener` and rejects popups.
 */
export const openOAuthRedirectWindow = (authUrl: string): Effect.Effect<void, never> =>
  Effect.sync(() => {
    window.open(authUrl, '_blank');
  });
