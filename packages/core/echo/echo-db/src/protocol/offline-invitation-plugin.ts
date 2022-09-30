//
// Copyright 2022 DXOS.org
//

import { GreetingCommandPlugin } from '@dxos/credentials';
import { PublicKey } from '@dxos/keys';

import { InvitationFactory, OfflineInvitationClaimer } from '../invitations';

/**
 * Creates network protocol plugin that allows peers to claim offline invitations.
 * Plugin is intended to be used in data-party swarms.
 */
export const createOfflineInvitationPlugin = (invitationFactory: InvitationFactory, peerId: PublicKey) => new GreetingCommandPlugin(
  peerId.asBuffer(),
  OfflineInvitationClaimer.createOfflineInvitationClaimHandler(invitationFactory)
);
