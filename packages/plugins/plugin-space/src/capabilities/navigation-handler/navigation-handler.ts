//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { OperationInvoker } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';

import { SpaceOperation } from '../../operations';

export type NavigationHandlerOptions = {
  invitationProp?: string;
};

/**
 * NavigationHandler for space invitation URL params.
 * Handles ?spaceInvitationCode=X → join space via invitation.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* ({ invitationProp = 'spaceInvitationCode' }: NavigationHandlerOptions = {}) {
    const capabilities = yield* Capability.Service;
    const operationService = yield* Capabilities.OperationInvoker;
    const client = yield* ClientCapabilities.Client;

    const handler: AppCapabilities.NavigationHandler = (url: URL) =>
      Effect.gen(function* () {
        const invitationCode = url.searchParams.get(invitationProp);
        if (!invitationCode) {
          return;
        }

        // Ignore invitations that arrive before a local identity exists rather than forcing
        // identity creation here, bypassing the normal onboarding flow.
        if (!client.halo.identity.get()) {
          return;
        }

        log('space invitation received via navigation');
        removeQueryParam(invitationProp);
        yield* Operation.invoke(SpaceOperation.Join, { invitationCode });
      }).pipe(
        Effect.provideService(Capability.Service, capabilities),
        Effect.provideService(Operation.Service, operationService),
        Effect.orDie,
      );

    return [Capability.provide(AppCapabilities.NavigationHandler, handler)];
  }),
);

/** Remove a query param from the current browser URL. */
const removeQueryParam = (key: string) => {
  const current = new URL(window.location.href);
  current.searchParams.delete(key);
  history.replaceState(null, '', current.pathname + current.search);
};
