//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Account from '@dxos/app-toolkit/Account';
import * as Operation from '@dxos/compute/Operation';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { CompleteOAuthRegistration } from './definitions.ts';

/**
 * Completes OAuth recovery registration for the local identity — see
 * {@link Account.completeOAuthRegistration}. Wrapped as an operation so UI surfaces can invoke it;
 * the flow itself is shared with the CLI's `dx account signup`.
 */
const handler: Operation.WithHandler<typeof CompleteOAuthRegistration> = CompleteOAuthRegistration.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const { email } = yield* Account.completeOAuthRegistration({
        client,
        registrationToken: data.registrationToken,
      });
      return { email };
    }),
  ),
);

export default handler;
