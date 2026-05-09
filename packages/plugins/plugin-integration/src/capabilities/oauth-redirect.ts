//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';

import { IntegrationCoordinator } from '#types';

import { OAUTH_REDIRECT_PATH } from '../constants';

/**
 * Startup module that finalizes redirect-flow OAuth callbacks.
 *
 * Captures `accessTokenId` and `accessToken` from `/redirect/oauth?…` and
 * rewrites `window.location` to `/` synchronously, so the deck's URL
 * handler doesn't try to interpret the redirect path. The actual finalize
 * work waits on `IntegrationCoordinator` (which depends on `ClientReady`)
 * and is fire-and-forget — Startup itself completes immediately so the
 * rest of the boot sequence is not blocked.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    if (typeof window === 'undefined') {
      return Capability.contributes(Capabilities.Null, null);
    }

    const url = new URL(window.location.href);
    if (url.pathname !== OAUTH_REDIRECT_PATH) {
      return Capability.contributes(Capabilities.Null, null);
    }

    const accessTokenId = url.searchParams.get('accessTokenId');
    const accessToken = url.searchParams.get('accessToken');

    // Edge stamps the literal "undefined" into the URL when the OAuth flow
    // failed before producing tokens; treat that as missing.
    const valid = !!accessTokenId && !!accessToken && accessTokenId !== 'undefined' && accessToken !== 'undefined';

    // Strip the OAuth params and rewrite to root regardless, so the deck
    // doesn't try to resolve `/redirect/oauth` as a workspace.
    window.history.replaceState(null, '', '/');

    if (!valid) {
      log.warn('oauth redirect: missing tokens', { accessTokenId, accessToken });
      return Capability.contributes(Capabilities.Null, null);
    }

    log('oauth redirect: capturing tokens', { accessTokenId });

    const capabilities = yield* Capability.Service;
    void runAndForwardErrors(
      Effect.gen(function* () {
        const coordinator = yield* Capability.waitFor(IntegrationCoordinator);
        yield* coordinator
          .finalizeRedirectFlow({ accessTokenId, accessToken })
          .pipe(Effect.catchAll((error) => Effect.sync(() => log.warn('redirect-flow finalize failed', { error }))));
      }).pipe(Effect.provideService(Capability.Service, capabilities)),
    );

    return Capability.contributes(Capabilities.Null, null);
  }),
);
