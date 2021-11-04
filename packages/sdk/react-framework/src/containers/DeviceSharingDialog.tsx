//
// Copyright 2020 DXOS.org
//

import { useClient } from '@dxos/react-client';
import React from 'react';

import { SharingDialog, SharingDialogProps } from './common';

/**
 * Manages the workflow for inviting a new device to a HALO party.
 */
export const DeviceSharingDialog = (props: Omit<SharingDialogProps, 'onShare' | 'title' | 'members'>) => {
  const client = useClient();

  const handleShare: SharingDialogProps['onShare'] = async ({options, secretProvider}) => {
    return await client.createHaloInvitation(secretProvider, options);
  };

  return (
    <SharingDialog {...props} title='Device Sharing' onShare={handleShare} />
  );
};
