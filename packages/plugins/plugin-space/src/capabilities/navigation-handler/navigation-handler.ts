//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { SpaceOperation } from '../../operations';

export type NavigationHandlerOptions = {
  invitationProp?: string;
};

/**
 * NavigationHandler for space invitation URL params.
 * Handles ?spaceInvitationCode=X → join space via invitation.
 */
const NavigationHandler = ({ invitationProp = 'spaceInvitationCode' }: NavigationHandlerOptions = {}) =>
  Capability.makeModule(
    Effect.fnUntraced(function* () {
      const capabilities = yield* Capability.Service;
      const operationService = yield* Capability.get(Capabilities.OperationInvoker);

      const handler: AppCapabilities.NavigationHandler = (url: URL) =>
        Effect.gen(function* () {
          const invitationCode = url.searchParams.get(invitationProp);
          if (invitationCode) {
            log.info('space invitation received via navigation');
            removeQueryParam(invitationProp);
            yield* Operation.invoke(SpaceOperation.Join, { invitationCode });
          }
        }).pipe(
          Effect.provideService(Capability.Service, capabilities),
          Effect.provideService(Operation.Service, operationService),
          Effect.orDie,
        );

      return Capability.contributes(AppCapabilities.NavigationHandler, handler);
    }),
  );

export default NavigationHandler;

/** Remove a query param from the current browser URL. */
const removeQueryParam = (key: string) => {
  const current = new URL(window.location.href);
  current.searchParams.delete(key);
  history.replaceState(null, '', current.pathname + current.search);
};
