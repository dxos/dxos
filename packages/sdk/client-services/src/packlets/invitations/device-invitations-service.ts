//
// Copyright 2022 DXOS.org
//

import { InvitationsHandler } from '@dxos/client';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { IdentityManager } from '../identity';
import { AbstractInvitationsService } from './invitations-service';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class DeviceInvitationsServiceImpl extends AbstractInvitationsService {
  // prettier-ignore
  constructor (
    identityManager: IdentityManager,
    private readonly invitationsHandler: InvitationsHandler
  ) {
    super(identityManager, () => invitationsHandler);
  }

  override getContext(invitation: Invitation) {}
}
