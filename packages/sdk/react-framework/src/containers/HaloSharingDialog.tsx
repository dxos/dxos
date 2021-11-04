//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { SharingDialog, SharingDialogProps } from './common';

/**
 * Manages the workflow for inviting a new device to a HALO party.
 */
export const HaloSharingDialog = (props: Omit<SharingDialogProps, 'type'>) => {
  return (
    <SharingDialog {...props} type="halo"/>
  )
};

