//
// Copyright 2022 DXOS.org
//

import { AbstractInvitationsProxy } from './invitations-proxy';

/**
 * Adapts invitation service observable to client/service stream.
 */
export class HaloInvitationsProxy extends AbstractInvitationsProxy {
  createInvitationObject() {
    return {};
  }
}
