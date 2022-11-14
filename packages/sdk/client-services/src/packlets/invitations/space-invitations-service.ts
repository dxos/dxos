//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Space, SpaceManager } from '@dxos/echo-db';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { Provider } from '@dxos/util';

import { IdentityManager } from '../identity';
import { InvitationsHandler } from './invitations-handler';
import { AbstractInvitationsService } from './invitations-service';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class SpaceInvitationsServiceImpl extends AbstractInvitationsService<Space> {
  // prettier-ignore
  constructor (
    identityManager: IdentityManager,
    private readonly invitationsHandler: Provider<InvitationsHandler<Space>>,
    private readonly _getSpaceManager: Provider<SpaceManager>
  ) {
    super(identityManager, invitationsHandler);
  }

  override getContext(invitation: Invitation): Space {
    assert(invitation.spaceKey);
    const spaceManager = this._getSpaceManager();
    const space = spaceManager.spaces.get(invitation.spaceKey!);
    assert(space);
    return space;
  }
}
