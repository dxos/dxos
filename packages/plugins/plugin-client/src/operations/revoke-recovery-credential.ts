//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { PublicKey } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';

import { ClientCapabilities } from '#types';

import { RevokeRecoveryCredential } from './definitions';

/**
 * Revoke one recovery credential.
 *
 * The write is an `IdentityRecoveryRevoked` assertion on the identity's own control feed, so the
 * identity key is the authorization and no identity can be passed in from the UI. Client services
 * refuse the last un-revoked credential.
 */
const handler: Operation.WithHandler<typeof RevokeRecoveryCredential> = RevokeRecoveryCredential.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ lookupKey }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const identityService = client.services.services.IdentityService;
      invariant(identityService, 'IdentityService not available');

      yield* Effect.promise(() => identityService.revokeRecoveryCredential({ lookupKey: PublicKey.from(lookupKey) }));
    }),
  ),
);

export default handler;
