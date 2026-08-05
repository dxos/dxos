//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Identity } from '@dxos/halo';
import { log } from '@dxos/log';
import { HaloServicesLayer } from '@dxos/plugin-client';

import { meta } from '#meta';

import { SpaceOperation } from '../../operations';

export type NavigationHandlerOptions = {
  invitationProp?: string;
  /** Set false when another plugin (e.g. plugin-onboarding) owns the invitation URL param. */
  invitationUrlHandler?: boolean;
};

/**
 * NavigationHandler for space invitation URL params.
 * Handles ?spaceInvitationCode=X → join space via invitation.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* ({
    invitationProp = 'spaceInvitationCode',
    invitationUrlHandler = true,
  }: NavigationHandlerOptions = {}) {
    const capabilities = yield* Capability.Service;
    const operationService = yield* Capabilities.OperationInvoker;

    const handler: AppCapabilities.NavigationHandler = (url: URL) =>
      Effect.gen(function* () {
        const invitationCode = invitationUrlHandler ? url.searchParams.get(invitationProp) : null;
        if (!invitationCode) {
          return;
        }

        // Ignore invitations that arrive before a local identity exists rather than forcing
        // identity creation here, bypassing the normal onboarding flow.
        if (Option.isNone(yield* Identity.getSnapshot.pipe(Effect.provide(HaloServicesLayer)))) {
          return;
        }

        log('space invitation received via navigation');
        removeQueryParam(invitationProp);
        yield* Operation.invoke(SpaceOperation.Join, { invitationCode });
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
