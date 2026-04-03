//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { ClientOperation } from '../../operations';

export type NavigationHandlerOptions = {
  invitationProp?: string;
  tokenProp?: string;
  tokenTypeProp?: string;
};

/**
 * NavigationHandler for auth-related URL params.
 * Handles login tokens and device invitation codes.
 */
const NavigationHandler = ({
  invitationProp = 'deviceInvitationCode',
  tokenProp = 'token',
  tokenTypeProp = 'type',
}: NavigationHandlerOptions = {}) =>
  Capability.makeModule(
    Effect.fnUntraced(function* () {
      const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);

      const handler: AppCapabilities.NavigationHandler = async (url: URL) => {
        const token = url.searchParams.get(tokenProp);
        const tokenType = url.searchParams.get(tokenTypeProp);
        const invitationCode = url.searchParams.get(invitationProp);

        if (token && tokenType === 'login') {
          log.info('login token received via navigation');
          removeQueryParam(tokenProp);
          removeQueryParam(tokenTypeProp);
          await invokePromise(ClientOperation.RedeemToken, { token });
        } else if (invitationCode) {
          log.info('device invitation received via navigation');
          removeQueryParam(invitationProp);
          await invokePromise(ClientOperation.JoinIdentity, { invitationCode });
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
