//
// Copyright 2022 DXOS.org
//

import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { IdentityManager } from '../identity';
import { InvitationsHandler } from './invitations-handler';
import { AbstractInvitationsService } from './invitations-service';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class HaloInvitationsServiceImpl extends AbstractInvitationsService {
  // prettier-ignore
  constructor (
    identityManager: IdentityManager,
    private readonly invitationsHandler: InvitationsHandler
  ) {
    super(identityManager, () => invitationsHandler);
  }

  override getContext(invitation: Invitation) {}
}
