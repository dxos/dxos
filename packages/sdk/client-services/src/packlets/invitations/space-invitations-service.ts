//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { Provider } from '@dxos/util';

import { IdentityManager } from '../identity';
import { DataSpace } from '../spaces/data-space';
import { DataSpaceManager } from '../spaces/data-space-manager';
import { InvitationsHandler } from './invitations-handler';
import { AbstractInvitationsService } from './invitations-service';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class SpaceInvitationsServiceImpl extends AbstractInvitationsService<DataSpace> {
  // prettier-ignore
  constructor (
    identityManager: IdentityManager,
    private readonly invitationsHandler: Provider<InvitationsHandler<DataSpace>>,
    private readonly _getSpaceManager: Provider<DataSpaceManager>
  ) {
    super(identityManager, invitationsHandler);
  }

  override getContext(invitation: Invitation): DataSpace {
    assert(invitation.spaceKey);
    const spaceManager = this._getSpaceManager();
    const space = spaceManager.spaces.get(invitation.spaceKey!);
    assert(space);
    return space;
  }
}
