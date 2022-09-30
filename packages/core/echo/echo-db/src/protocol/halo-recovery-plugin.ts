//
// Copyright 2022 DXOS.org
//

import { GreetingCommandPlugin } from '@dxos/credentials';
import { PublicKey } from '@dxos/keys';

import { HaloRecoveryInitiator, InvitationFactory } from '../invitations';

/**
 * Creates network protocol plugin that allows peers to recover access to their HALO.
 * Plugin is intended to be used in HALO party swarm.
 *
 */
export const createHaloRecoveryPlugin = (identityKey: PublicKey, invitationFactory: InvitationFactory, peerId: PublicKey) => new GreetingCommandPlugin(
  peerId.asBuffer(),
  HaloRecoveryInitiator.createHaloInvitationClaimHandler(identityKey, invitationFactory)
);
