//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Invitation } from '@dxos/client';
import { useClient, useHaloInvitations } from '@dxos/react-client';

import { SharingDialog, SharingDialogProps } from './SharingDialog';

export type HaloSharingDialogProps = Omit<
  SharingDialogProps,
  'onCreateInvitation' | 'onCancelInvitation' | 'title' | 'members'
>;

/**
 * Manages the workflow for inviting a new device to a HALO space.
 */
export const HaloSharingDialog = (props: HaloSharingDialogProps) => {
  const client = useClient();
  const _invitations = useHaloInvitations();

  const handleCreateInvitation = async () => {
    await client.halo.createInvitation();
    throw new Error('Not implemented.');
  };

  const handleCancelInvitation = async (invitation: Invitation) => {
    // TODO(burdon): Get observable from useInvitations.
    throw new Error('Not implemented.');
  };

  return (
    <SharingDialog
      {...props}
      title='Halo Sharing'
      invitations={[]}
      onCreateInvitation={handleCreateInvitation}
      onCancelInvitation={handleCancelInvitation}
    />
  );
};
