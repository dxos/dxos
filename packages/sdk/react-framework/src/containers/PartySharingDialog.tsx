//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { encodeInvitation, PendingInvitation } from '@dxos/client';
import { generatePasscode } from '@dxos/credentials';
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

  // The old way - before the migration to new Client API with Client Services.
  const createInvitation: SharingDialogProps['onCreateInvitation'] = (setInvitations) => async () => {
    let pendingInvitation: PendingInvitation; // eslint-disable-line prefer-const

    // Called when other side joins the invitation party.
    const secretProvider = () => {
      pendingInvitation.pin = generatePasscode();
      setInvitations(invitations => [...invitations]);
      return Promise.resolve(Buffer.from(pendingInvitation.pin));
    };

    const invitation = await client.createInvitation(partyKey!, { secretProvider }, {
      onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
      // Remove the pending invitation.
        setInvitations(invitations => invitations
          .filter(invitation => invitation.invitationCode !== pendingInvitation.invitationCode));
      }
    });

    pendingInvitation = {
      invitationCode: encodeInvitation(invitation),
      pin: undefined // Generated above.
    };

    setInvitations(invitations => [...invitations, pendingInvitation]);
  };

  return (
    <SharingDialog
      {...props}
      title='Party Sharing'
      onCreateInvitation={createInvitation}
      members={members}
    />
  );
};
