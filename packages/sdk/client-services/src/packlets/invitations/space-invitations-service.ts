//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { InvitationsHandler } from '@dxos/client';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { IdentityManager } from '../identity';
import { DataSpace, DataSpaceManager } from '../spaces';
import { AbstractInvitationsService } from './invitations-service';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class SpaceInvitationsServiceImpl extends AbstractInvitationsService<DataSpace> {
  // prettier-ignore
  constructor (
    identityManager: IdentityManager,
    private readonly invitationsHandler: InvitationsHandler<DataSpace>,
    private readonly _spaceManager: DataSpaceManager
  ) {
    super(identityManager, () => invitationsHandler);
  }

  override getContext(invitation: Invitation): DataSpace {
    assert(invitation.spaceKey);
    const space = this._spaceManager.spaces.get(invitation.spaceKey!);
    assert(space);
    return space;
  }
}
