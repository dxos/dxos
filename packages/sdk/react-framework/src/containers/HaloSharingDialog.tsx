//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';

import { SharingDialog, SharingDialogProps } from './SharingDialog';

/**
 * Manages the workflow for inviting a new device to a HALO party.
 */
export const HaloSharingDialog = (props: Omit<SharingDialogProps, 'onShare' | 'title' | 'members'>) => {
  const client = useClient();

  const handleShare: SharingDialogProps['onShare'] = async ({ options, secretProvider }) => {
    return await client.createHaloInvitation(secretProvider, options);
  };

  return (
    <SharingDialog
      {...props}
      title='Halo Sharing'
      onShare={handleShare}
    />
  );
};
