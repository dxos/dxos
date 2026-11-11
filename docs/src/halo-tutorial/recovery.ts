//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Identity } from '@dxos/halo';

// #region create
/** Makes a recovery code, and returns it. HALO shows it only this once. */
export const createRecoveryCode = Effect.gen(function* () {
  const { recoveryCode } = yield* Identity.createRecoveryCredential();
  return recoveryCode;
});
// #endregion

// #region list
/** The recovery credentials that still work, now and after each change. */
export const recoveryCodes = Identity.credentials.pipe(
  Stream.map((credentials) =>
    credentials.flatMap(({ recovery, issuanceDate }) =>
      recovery && !recovery.revoked ? [{ ...recovery, issuanceDate }] : [],
    ),
  ),
);
// #endregion

// #region revoke
/** Revokes the recovery credential with `lookupKey`. */
export const revokeRecoveryCode = (lookupKey: string) =>
  Identity.revokeRecoveryCredential(lookupKey);
// #endregion

// #region recover
/** On a new device, gets the identity back with `recoveryCode`. */
export const recover = (recoveryCode: string) =>
  Identity.recover({ recoveryCode });
// #endregion
