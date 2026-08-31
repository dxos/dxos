//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as Capability from '@dxos/app-framework/Capability';
import * as NativeOAuth from '@dxos/app-toolkit/NativeOAuth';
import { log } from '@dxos/log';

import { ConnectorCoordination } from '#types';

import { OAUTH_REDIRECT_PATH } from '../constants';

/** Edge stamps the literal "undefined" into the URL when no tokens were produced. */
const isPresent = (value: string | null): value is string => !!value && value !== 'undefined';

const parseRedirectTokens = (url: URL): { accessTokenId: string; accessToken: string } | undefined => {
  const accessTokenId = url.searchParams.get('accessTokenId');
  const accessToken = url.searchParams.get('accessToken');
  if (!isPresent(accessTokenId) || !isPresent(accessToken)) {
    log.warn('oauth redirect: missing tokens', { accessTokenId, hasAccessToken: isPresent(accessToken) });
    return undefined;
  }
  return { accessTokenId, accessToken };
};

const readRedirectTokens = (): { accessTokenId: string; accessToken: string } | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const url = new URL(window.location.href);
  if (url.pathname !== OAUTH_REDIRECT_PATH) {
    return undefined;
  }
  const tokens = parseRedirectTokens(url);

  // Strip the OAuth params and rewrite to root regardless, so the deck
  // doesn't try to resolve `/redirect/oauth` as a workspace.
  window.history.replaceState(null, '', '/');

  return tokens;
};

/**
 * Startup module that finalizes redirect-flow OAuth callbacks.
 *
 * Captures `accessTokenId` and `accessToken` from `/redirect/oauth?…` and rewrites
 * `window.location` to `/` synchronously, so the deck's URL handler doesn't try to interpret the
 * redirect path. On desktop nothing navigates there — the shell hosts the auth page and relays the
 * callback URL as an event instead — so the same tokens arrive on a stream.
 * `ConnectorCoordination.ConnectorCoordinator` is a declared dependency, so it is already active by
 * the time this module runs; the finalize work still runs on a daemon fiber so Startup completes
 * immediately and the rest of the boot sequence isn't blocked.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const coordinator = yield* ConnectorCoordination.ConnectorCoordinator;
    const finalize = (tokens: { accessTokenId: string; accessToken: string }) => {
      log('oauth redirect: capturing tokens', { accessTokenId: tokens.accessTokenId });
      return coordinator
        .finalizeRedirectFlow(tokens)
        .pipe(Effect.catch((error) => Effect.sync(() => log.warn('redirect-flow finalize failed', { error }))));
    };

    const tokens = readRedirectTokens();
    if (tokens) {
      yield* Effect.forkDetach(finalize(tokens));
    }

    if (NativeOAuth.supportsNativeOAuth()) {
      yield* Effect.forkDetach(
        NativeOAuth.nativeOAuthCallbacks(OAUTH_REDIRECT_PATH).pipe(
          Stream.runForEach((url) =>
            Effect.suspend(() => {
              const callbackTokens = parseRedirectTokens(url);
              return callbackTokens ? finalize(callbackTokens) : Effect.void;
            }),
          ),
          Effect.catch((error) =>
            Effect.sync(() => log.warn('oauth redirect: native callback stream failed', { error })),
          ),
        ),
      );
    }

    return [];
  }),
);
