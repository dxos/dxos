//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { v4 } from 'uuid';

import { PendingInvitation } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { SharingDialog, SharingDialogProps } from './SharingDialog';

export type HaloSharingDialogProps = Omit<SharingDialogProps, 'onCreateInvitation' | 'title' | 'members'>

/**
 * Manages the workflow for inviting a new device to a HALO party.
 */
export const HaloSharingDialog = (props: HaloSharingDialogProps) => {
  const client = useClient();

  const handleCreateInvitation: SharingDialogProps['onCreateInvitation'] = (setInvitations) => async () => {
    const id = v4();
    const invitation = await client.createHaloInvitation({
      onFinish: () => {
        setInvitations(invitations => invitations.filter(invitation => invitation.id !== id));
      }
    });

    const pendingInvitation: PendingInvitation = { ...invitation, id };
    setInvitations(invitations => [...invitations, pendingInvitation]);
  };

  return (
    <SharingDialog
      {...props}
      title='Halo Sharing'
      onCreateInvitation={handleCreateInvitation}
    />
  );
};
