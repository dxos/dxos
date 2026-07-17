//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';

import { ConnectorCoordinator } from '#types';

import { OAUTH_REDIRECT_PATH } from '../constants';

/**
 * Startup module that finalizes redirect-flow OAuth callbacks.
 *
 * Captures `accessTokenId` and `accessToken` from `/redirect/oauth?…` and
 * rewrites `window.location` to `/` synchronously, so the deck's URL
 * handler doesn't try to interpret the redirect path. `ConnectorCoordinator`
 * is a declared dependency, so it is already active by the time this module
 * runs; the finalize work still runs on a daemon fiber so Startup completes
 * immediately and the rest of the boot sequence isn't blocked.
 */

/** Edge stamps the literal "undefined" into the URL when no tokens were produced. */
const isPresent = (value: string | null): value is string => !!value && value !== 'undefined';

const readRedirectTokens = (): { accessTokenId: string; accessToken: string } | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const url = new URL(window.location.href);
  if (url.pathname !== OAUTH_REDIRECT_PATH) {
    return undefined;
  }

  const accessTokenId = url.searchParams.get('accessTokenId');
  const accessToken = url.searchParams.get('accessToken');

  // Strip the OAuth params and rewrite to root regardless, so the deck
  // doesn't try to resolve `/redirect/oauth` as a workspace.
  window.history.replaceState(null, '', '/');

  if (!isPresent(accessTokenId) || !isPresent(accessToken)) {
    log.warn('oauth redirect: missing tokens', { accessTokenId, hasAccessToken: isPresent(accessToken) });
    return undefined;
  }
  return { accessTokenId, accessToken };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const tokens = readRedirectTokens();
    if (tokens) {
      log('oauth redirect: capturing tokens', { accessTokenId: tokens.accessTokenId });
      const coordinator = yield* ConnectorCoordinator;
      yield* Effect.forkDaemon(
        coordinator
          .finalizeRedirectFlow(tokens)
          .pipe(Effect.catchAll((error) => Effect.sync(() => log.warn('redirect-flow finalize failed', { error })))),
      );
    }
    return [];
  }),
);
