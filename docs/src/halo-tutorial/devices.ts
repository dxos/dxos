//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Identity, Invitation } from '@dxos/halo';

// #region share
/**
 * Starts an invitation for another device of yours, and returns the flow and
 * the code to open on that device.
 */
export const addDevice = Effect.gen(function* () {
  const flow = yield* Identity.share({ authMethod: 'shared-secret' });
  const code = yield* Invitation.code(flow);
  return { flow, code };
});
// #endregion

// #region join
/** On the new device, redeems the invitation `code`, and returns the flow. */
export const joinIdentity = (code: string) => Identity.join(code);
// #endregion

// #region list
/** Your devices, now and after each change. */
export const devices = Identity.devices;
// #endregion
