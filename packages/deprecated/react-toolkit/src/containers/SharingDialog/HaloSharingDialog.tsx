//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { invitationObservable, Invitation } from '@dxos/client';
import { useClient, useHaloInvitations } from '@dxos/react-client';

import { SharingDialog, SharingDialogProps } from './SharingDialog';

export type HaloSharingDialogProps = Omit<
  SharingDialogProps,
  'onCreateInvitation' | 'onCancelInvitation' | 'title' | 'members'
>;

/**
 * Manages the workflow for inviting a new device to a HALO party.
 */
export const HaloSharingDialog = (props: HaloSharingDialogProps) => {
  const client = useClient();
  const invitations = useHaloInvitations(client);

  const handleCreateInvitation = async () => {
    const observable = client.halo.createInvitation();
    // TODO(burdon): Add to invitations.
    await invitationObservable(observable);
  };

  const handleCancelInvitation = async (invitation: Invitation) => {
    // TODO(burdon): Get observable from useInvitations.
    throw new Error('Not implemented.');
  };

  return (
    <SharingDialog
      {...props}
      title='Halo Sharing'
      invitations={invitations}
      onCreateInvitation={handleCreateInvitation}
      onCancelInvitation={handleCancelInvitation}
    />
  );
};
