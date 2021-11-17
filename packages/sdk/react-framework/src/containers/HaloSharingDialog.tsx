//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';

import { SharingDialog, SharingDialogProps } from './SharingDialog';

export interface HaloSharingDialogProps extends Omit<SharingDialogProps, 'onShare' | 'title' | 'members'> {
  remote?: boolean; // Whether the Client works in remote mode.
}

/**
 * Manages the workflow for inviting a new device to a HALO party.
 */
export const HaloSharingDialog = ({remote, ...props}: HaloSharingDialogProps) => {
  const client = useClient();

  const handleShare: SharingDialogProps['onShare'] = async ({ options, secretProvider }) => {
    throw new Error('shouldn happen now')
    return await client.createHaloInvitation(secretProvider, options);
  };

  // Override for the remote client case.
  const handleCreateInvitation: SharingDialogProps['onCreateInvitation'] = async () => {
    console.log('sharing invitation...')
    const stream = await client.services.ProfileService.CreateInvitation();
    return new Promise((resolve, reject) => {
      stream.subscribe(invitation => {
        console.log('stream on subscription', invitation)
        if (!invitation.invitationCode) {
          reject('Invitation Code is missing.')
        }
        if (!invitation.secret) {
          reject('Secret is missing.')
        }
        resolve({invitationCode: invitation.invitationCode!, pin: invitation.secret})
      }, reject)
    })

  };

  return (
    <SharingDialog
      {...props}
      title='Halo Sharing'
      onShare={handleShare}
      onCreateInvitation={remote ? handleCreateInvitation : undefined}
    />
  );
};
