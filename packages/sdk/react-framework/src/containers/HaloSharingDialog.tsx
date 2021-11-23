//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { encodeInvitation } from '@dxos/client';
import { generatePasscode } from '@dxos/credentials';
import { useClient } from '@dxos/react-client';

import { PendingInvitation } from '../hooks';
import { SharingDialog, SharingDialogProps } from './SharingDialog';

export interface HaloSharingDialogProps extends Omit<SharingDialogProps, 'onCreateInvitation' | 'title' | 'members'> {
  remote?: boolean; // Whether the Client works in remote mode.
}

/**
 * Manages the workflow for inviting a new device to a HALO party.
 */
export const HaloSharingDialog = ({ remote, ...props }: HaloSharingDialogProps) => {
  const client = useClient();

  // The old way - before the migration to new Client API with Client Services.
  const createLocalInvitation: SharingDialogProps['onCreateInvitation'] = (setInvitations) => async () => {
    let pendingInvitation: PendingInvitation; // eslint-disable-line prefer-const

    // Called when other side joins the invitation party.
    const secretProvider = () => {
      pendingInvitation.pin = generatePasscode();
      setInvitations(invitations => [...invitations]);
      return Promise.resolve(Buffer.from(pendingInvitation.pin));
    };

    const invitation = await client.createHaloInvitation(secretProvider, {
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

  // The new way - using the remote Client API.
  const createRemoteInvitation: SharingDialogProps['onCreateInvitation'] = (setInvitations) => async () => {
    console.log('sharing invitation...');
    const stream = await client.services.ProfileService.CreateInvitation();
    stream.subscribe(invitationMsg => {
      if (invitationMsg.finished) {
        setInvitations(invitations => invitations
          .filter(invitation => invitation.invitationCode !== invitationMsg.invitationCode));
      } else {
        const pendingInvitation: PendingInvitation = { invitationCode: invitationMsg.invitationCode!, pin: invitationMsg.secret };
        setInvitations(invitations => [...invitations, pendingInvitation]);
      }
    }, error => {
      console.error(error);
      // TODO(rzadp): Handle error / retry.
    });
  };

  return (
    <SharingDialog
      {...props}
      title='Halo Sharing'
      onCreateInvitation={remote ? createRemoteInvitation : createLocalInvitation}
    />
  );
};
