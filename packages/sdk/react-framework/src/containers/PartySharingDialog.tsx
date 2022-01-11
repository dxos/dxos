//
// Copyright 2020 DXOS.org
//

import React from 'react';

import type { PublicKey } from '@dxos/crypto';
import { useMembers, useParty, usePartyInvitations } from '@dxos/react-client';

import { SharingDialog, SharingDialogProps } from './SharingDialog';

export interface PartySharingDialogProps extends Omit<SharingDialogProps, 'onCreateInvitation' | 'onCancelInvitation' | 'title' | 'members'> {
  partyKey: PublicKey,
}

/**
 * Manages the workflow for inviting a user to a party.
 */
export const PartySharingDialog = ({ partyKey, ...props }: PartySharingDialogProps) => {
  const party = useParty(partyKey);
  const members = useMembers(party);
  const invitations = usePartyInvitations(partyKey);

  return (
    <SharingDialog
      {...props}
      title='Party Sharing'
      invitations={invitations}
      onCreateInvitation={async () => {
        await party!.createInvitation();
      }}
      onCancelInvitation={invitation => party!.removeInvitation(invitation)}
      members={members}
    />
  );
};
