//
// Copyright 2020 DXOS.org
//

import { Config } from '@dxos/config';
import { Fubar } from '@dxos/echo-db';
// import { ECHO } from '@dxos/echo-db';

import { HaloSigner } from '../../api';

export type CreateServicesOpts = {
  config: Config
  /**
   * @deprecated
   */
  echo: any,
  fubar: Fubar,
  signer?: HaloSigner
}

// TODO(burdon): Change to type def.
export interface InviterInvitation {
  // TODO(rzadp): Change it to use descriptors with secrets build-in instead.
  invitationCode: string
  secret: Uint8Array | undefined
}

// TODO(burdon): Change to type def (if able to remove callback from data structure).
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
