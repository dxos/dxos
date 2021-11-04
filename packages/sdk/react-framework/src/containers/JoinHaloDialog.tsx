//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { JoinDialog, JoinDialogProps } from './common';

/**
 * Manages the workflow of joining a HALO invitation.
 */
export const JoinHaloDialog = (props: Omit<JoinDialogProps, 'type'>) => {
  return (
    <JoinDialog {...props} type="halo"/>
  )
};

