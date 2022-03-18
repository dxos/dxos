//
// Copyright 2020 DXOS.org
//

import React from 'react';

import type { PublicKey } from '@dxos/crypto';
import { useBotFactoryClient, useMembers, useParty, usePartyInvitations } from '@dxos/react-client';
import { Resource } from '@dxos/registry-client';

import { SharingDialog, SharingDialogProps } from './SharingDialog';

export interface PartySharingDialogProps extends Omit<SharingDialogProps,
  'title' | 'members' | 'onCreateInvitation' | 'onCancelInvitation' | 'onCreateBotInvitation'> {
  partyKey: PublicKey
}

/**
 * Manages the workflow for inviting a user to a party.
 */
export const PartySharingDialog = ({ partyKey, ...props }: PartySharingDialogProps) => {
  const party = useParty(partyKey);
  const members = useMembers(party);
  const invitations = usePartyInvitations(partyKey);
  const botClient = useBotFactoryClient(false);

  const handleInvitation = async () => {
    await party!.createInvitation();
  };

  const handleBotInvitation = botClient ? async (resource: Resource) => {
    await botClient!.spawn({ dxn: resource.id.toString() }, party!);
  } : undefined;

  if (!party) {
    return null;
  }

  return (
    <SharingDialog
      {...props}
      title='Party Sharing'
      members={members}
      invitations={invitations}
      onCreateInvitation={handleInvitation}
      onCancelInvitation={invitation => invitation.cancel()}
      onCreateBotInvitation={handleBotInvitation}
    />
  );
};
