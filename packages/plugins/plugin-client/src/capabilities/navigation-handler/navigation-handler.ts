//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';

import { meta } from '#meta';

import { ClientOperation } from '../../operations';
import * as ClientCapabilities from '../../types/ClientCapabilities';

export type NavigationHandlerOptions = {
  invitationProp?: string;
  tokenProp?: string;
  tokenTypeProp?: string;
  /** Set false when another plugin (e.g. plugin-onboarding) owns the invitation URL param. */
  invitationUrlHandler?: boolean;
};

/**
 * NavigationHandler for auth-related URL params.
 * Handles login tokens and device invitation codes.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* ({
    invitationProp = 'deviceInvitationCode',
    tokenProp = 'token',
    tokenTypeProp = 'type',
    invitationUrlHandler = true,
  }: NavigationHandlerOptions = {}) {
    const capabilities = yield* Capability.Service;
    const operationService = yield* Capabilities.OperationInvoker;
    const client = yield* ClientCapabilities.Client;

    const handler: AppCapabilities.NavigationHandler = (url: URL) =>
      Effect.gen(function* () {
        const token = url.searchParams.get(tokenProp);
        const tokenType = url.searchParams.get(tokenTypeProp);
        const invitationCode = invitationUrlHandler ? url.searchParams.get(invitationProp) : null;

        // The param is consumed only once the operation has succeeded. Navigation handlers now
        // dispatch before `client.initialize()` resolves, so a pre-init attempt fails against an
        // unopened identity service — stripping first would destroy a one-time credential that the
        // onboarding manager (which re-reads `location.search` on `ClientEvents.Initialized`) is
        // still able to redeem.
        if (token && tokenType === 'login') {
          log('login token received via navigation');
          yield* Operation.invoke(ClientOperation.RedeemToken, { token });
          removeQueryParam(tokenProp);
          removeQueryParam(tokenTypeProp);
        } else if (invitationCode) {
          log('device invitation received via navigation');
          yield* Operation.invoke(ClientOperation.JoinIdentity, { invitationCode });
          removeQueryParam(invitationProp);
        }
      }).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            log.warn('navigation handler failed', { error });
            // A pre-init failure is expected and recoverable — the credential is still in the URL
            // for whoever redeems it after initialization — so it must not surface as an error.
            if (!client.initialized) {
              return;
            }
            yield* Operation.invoke(LayoutOperation.AddToast, {
              id: `${meta.profile.key}/navigation-failed`,
              title: ['navigation-failed-toast.title', { ns: meta.profile.key }],
              description: ['navigation-failed-toast.description', { ns: meta.profile.key }],
              icon: 'ph--warning--regular',
            }).pipe(
              Effect.catchAll((toastError) => Effect.sync(() => log.warn('failed to add toast', { toastError }))),
            );
          }),
        ),
        Effect.provideService(Capability.Service, capabilities),
        Effect.provideService(Operation.Service, operationService),
      );

    return Capability.contribute(AppCapabilities.NavigationHandler, handler);
  }),
);

/** Remove a query param from the current browser URL. */
const removeQueryParam = (key: string) => {
  const current = new URL(window.location.href);
  current.searchParams.delete(key);
  history.replaceState(null, '', current.pathname + current.search);
};
