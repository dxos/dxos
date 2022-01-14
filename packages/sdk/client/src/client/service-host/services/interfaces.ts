//
// Copyright 2020 DXOS.org
//

import { Config } from '@dxos/config';
import { ECHO } from '@dxos/echo-db';

export interface CreateServicesOpts {
  config: Config,
  echo: ECHO
}

export interface InviterInvitation {
  // TODO(rzadp): Change it to use descriptors with secrets build-in instead.
  invitationCode: string
  secret: Uint8Array | undefined
}

export interface InviteeInvitation {
  secret?: Uint8Array | undefined // Can be undefined initially, then set after receiving secret from the inviter.
  secretTrigger?: () => void // Is triggered after supplying the secret.
}

/**
 * List of pending invitations from the inviter side.
 */
export type InviterInvitations = InviterInvitation[];

/**
 * Map of pending invitations from the invitee side.
 */
export type InviteeInvitations = Map<string, InviteeInvitation>;
