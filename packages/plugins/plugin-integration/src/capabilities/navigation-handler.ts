//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';

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
 *
 * Always navigates the user back to a real workspace afterwards (even on
 * failure) so the redirect tab does not strand on `/redirect/oauth`.
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
        // Edge stamps the literal string "undefined" into the URL when the
        // OAuth flow failed before reaching the success branch. Treat as
        // failure rather than attempting to finalize.
        const valid =
          accessTokenId &&
          accessToken &&
          accessTokenId !== 'undefined' &&
          accessToken !== 'undefined';

        if (valid) {
          log('oauth redirect callback', { accessTokenId });
          // Strip tokens from the URL before any other code can read them.
          const next = new URL(window.location.href);
          next.searchParams.delete('accessTokenId');
          next.searchParams.delete('accessToken');
          window.history.replaceState(null, '', next.pathname + next.search);

          const coordinator = yield* Capability.get(IntegrationCoordinator);
          yield* coordinator.finalizeRedirectFlow({ accessTokenId, accessToken }).pipe(
            Effect.catchAll((error) => Effect.sync(() => log.warn('redirect-flow finalize failed', { error }))),
          );
        } else {
          log.warn('oauth redirect missing tokens', { accessTokenId, accessToken });
        }

        // Navigate away from `/redirect/oauth` so the tab lands somewhere
        // visible. `finalizeRedirectFlow` itself navigates to the new
        // integration on success; this handles the failure / no-op cases.
        const client = yield* Capability.get(ClientCapabilities.Client);
        yield* Effect.tryPromise({
          try: () => client.spaces.waitUntilReady(),
          catch: (error) => (error instanceof Error ? error : new Error(String(error))),
        }).pipe(Effect.catchAll(() => Effect.void));
        const defaultSpaceId = client.spaces.default?.id;
        if (defaultSpaceId) {
          yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: defaultSpaceId }).pipe(
            Effect.catchAll((error) => Effect.sync(() => log.warn('switch-workspace failed', { error }))),
          );
        }
      }).pipe(
        Effect.provideService(Capability.Service, capabilities),
        Effect.provideService(Operation.Service, operationService),
        Effect.catchAll((error) => Effect.sync(() => log.warn('redirect-flow handler failed', { error }))),
      );

    return Capability.contributes(AppCapabilities.NavigationHandler, handler);
  }),
);
