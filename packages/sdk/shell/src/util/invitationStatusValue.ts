//
// Copyright 2023 DXOS.org
//

import { Invitation_State } from '@dxos/react-client/invitations';

/**
 * This map assigns a numeric value to invitation states to facilitate
 * more terse code which uses combinations of `>`, `<`, and `=` instead of
 * longer sequences of `===` and `||` predicates.
 */
export const invitationStatusValue = new Map<Invitation_State, number>([
  [Invitation_State.ERROR, -3],
  [Invitation_State.TIMEOUT, -2],
  [Invitation_State.CANCELLED, -1],
  [Invitation_State.INIT, 0],
  [Invitation_State.CONNECTING, 1],
  [Invitation_State.CONNECTED, 2],
  [Invitation_State.READY_FOR_AUTHENTICATION, 3],
  [Invitation_State.AUTHENTICATING, 4],
  [Invitation_State.SUCCESS, 5],
]);
