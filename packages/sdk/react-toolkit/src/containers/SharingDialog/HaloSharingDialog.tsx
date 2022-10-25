//
// Copyright 2020 DXOS.org
//

import React from 'react';

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

  return (
    <SharingDialog
      {...props}
      title='Halo Sharing'
      invitations={invitations}
      onCreateInvitation={async () => {
        await client.halo.createInvitation();
      }}
      onCancelInvitation={(invitation) => invitation.cancel()}
    />
  );
};
