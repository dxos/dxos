//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';

import { meta } from '#meta';

import { ClientOperation } from '../../operations';

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

    const handler: AppCapabilities.NavigationHandler = (url: URL) =>
      Effect.gen(function* () {
        const token = url.searchParams.get(tokenProp);
        const tokenType = url.searchParams.get(tokenTypeProp);
        const invitationCode = invitationUrlHandler ? url.searchParams.get(invitationProp) : null;

        if (token && tokenType === 'login') {
          log('login token received via navigation');
          removeQueryParam(tokenProp);
          removeQueryParam(tokenTypeProp);
          yield* Operation.invoke(ClientOperation.RedeemToken, { token });
        } else if (invitationCode) {
          log('device invitation received via navigation');
          removeQueryParam(invitationProp);
          yield* Operation.invoke(ClientOperation.JoinIdentity, { invitationCode });
        }
      }).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            log.warn('navigation handler failed', { error });
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
