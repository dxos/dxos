//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';

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
      yield* Identity.revokeRecoveryCredential(lookupKey);
    }),
  ),
);

export default handler;
