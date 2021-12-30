//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { v4 } from 'uuid';

import { PendingInvitation } from '@dxos/client';
import type { PublicKey } from '@dxos/crypto';
import { useClient, useMembers, useParty } from '@dxos/react-client';

import { SharingDialog, SharingDialogProps } from './SharingDialog';

export interface PartySharingDialogProps extends Omit<SharingDialogProps, 'onCreateInvitation' | 'title' | 'members'> {
  partyKey: PublicKey,
}

/**
 * Manages the workflow for inviting a user to a party.
 */
export const PartySharingDialog = ({ partyKey, ...props }: PartySharingDialogProps) => {
  const client = useClient();
  const party = useParty(partyKey);
  const members = useMembers(party);

  const handleCreateInvitation: SharingDialogProps['onCreateInvitation'] = (setInvitations) => async () => {
    const id = v4();
    const invitation = await await client.echo.createInvitation(partyKey!, {
      onFinish: () => {
        setInvitations(invitations => invitations.filter(invitation => invitation.id !== id));
      },
      onPinGenerated: (pin) => {
        setInvitations(invitations => {
          const invitationWithPin = invitations.find(invitation => invitation.id === id);
          if (!invitationWithPin) {
            return invitations;
          }
          return [
            ...invitations.filter(invitation => invitation.id !== id),
            { ...invitationWithPin, pin }
          ];
        });
      }
    });

    const pendingInvitation: PendingInvitation = { ...invitation, id };
    setInvitations(invitations => [...invitations, pendingInvitation]);
  };

  return (
    <SharingDialog
      {...props}
      title='Party Sharing'
      onCreateInvitation={handleCreateInvitation}
      members={members}
    />
  );
};
