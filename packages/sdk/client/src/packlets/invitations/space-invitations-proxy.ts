//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { AbstractInvitationsProxy } from './invitations-proxy';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class SpaceInvitationsProxy extends AbstractInvitationsProxy<PublicKey> {
  override getInvitationOptions(context: PublicKey): Invitation {
    return {
      ...super.getInvitationOptions(context),
      spaceKey: context
    };
  }
}
