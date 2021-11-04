//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { SharingDialog, SharingDialogProps } from './common';

/**
 * Manages the workflow for inviting a user to a party.
 */
export const PartySharingDialog = (props: Omit<SharingDialogProps, 'type' | 'title'>) => {
  return (
    <SharingDialog {...props} type='party' title='Party Sharing' />
  );
};
