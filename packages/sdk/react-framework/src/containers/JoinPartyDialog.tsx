//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { JoinDialog, JoinDialogProps } from './common';

/**
 * Manages the workflow of joining a Party invitation.
 */
export const JoinPartyDialog = (props: Omit<JoinDialogProps, 'type' | 'title'>) => {
  return (
    <JoinDialog {...props} type="party" title="Join Party" />
  )
};

