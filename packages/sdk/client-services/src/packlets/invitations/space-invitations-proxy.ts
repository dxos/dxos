//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { AbstractInvitationsProxy } from './invitations-proxy';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class SpaceInvitationsProxy extends AbstractInvitationsProxy<PublicKey> {
  getInvitationOptions(context: PublicKey) {
    return { spaceKey: context };
  }
}
