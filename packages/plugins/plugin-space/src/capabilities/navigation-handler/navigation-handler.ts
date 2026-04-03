//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

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
      const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);

      const handler: AppCapabilities.NavigationHandler = async (url: URL) => {
        const invitationCode = url.searchParams.get(invitationProp);
        if (invitationCode) {
          log.info('space invitation received via navigation');
          removeQueryParam(invitationProp);
          await invokePromise(SpaceOperation.Join, { invitationCode });
        }
      };

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
