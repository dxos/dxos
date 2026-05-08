//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';

import { IntegrationCoordinator } from '#types';

import { OAUTH_REDIRECT_PATH } from '../constants';

/**
 * NavigationHandler that finalizes redirect-flow OAuth callbacks.
 *
 * Edge redirects to `/redirect/oauth?accessTokenId=…&accessToken=…` for
 * providers (atproto / bsky.social) that nullify `window.opener` and so
 * cannot use the popup + `postMessage` path. The new tab loads Composer at
 * that URL; this handler picks the params out of the URL and hands them
 * to {@link IntegrationCoordinator.finalizeRedirectFlow}, which restores
 * the pending entry from `localStorage` and runs the standard finalize
 * path (db.add, dispatchAccessTokenCreated, navigation).
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const operationService = yield* Capability.get(Capabilities.OperationInvoker);

    const handler: AppCapabilities.NavigationHandler = (url: URL) =>
      Effect.gen(function* () {
        if (url.pathname !== OAUTH_REDIRECT_PATH) {
          return;
        }
        const accessTokenId = url.searchParams.get('accessTokenId');
        const accessToken = url.searchParams.get('accessToken');
        if (!accessTokenId || !accessToken) {
          return;
        }
        log('oauth redirect callback', { accessTokenId });

        // Strip tokens from the URL before any other code can read them.
        const next = new URL(window.location.href);
        next.searchParams.delete('accessTokenId');
        next.searchParams.delete('accessToken');
        window.history.replaceState(null, '', next.pathname + next.search);

        const coordinator = yield* Capability.get(IntegrationCoordinator);
        yield* coordinator.finalizeRedirectFlow({ accessTokenId, accessToken });
      }).pipe(
        Effect.provideService(Capability.Service, capabilities),
        Effect.provideService(Operation.Service, operationService),
        Effect.catchAll((error) => Effect.sync(() => log.warn('redirect-flow finalize failed', { error }))),
      );

    return Capability.contributes(AppCapabilities.NavigationHandler, handler);
  }),
);
