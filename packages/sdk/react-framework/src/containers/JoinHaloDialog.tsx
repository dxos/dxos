//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';

import { JoinDialog, JoinDialogProps } from './common';

/**
 * Manages the workflow of joining a HALO invitation.
 */
export const JoinHaloDialog = (props: Omit<JoinDialogProps, 'onJoin' | 'title'>) => {
  const client = useClient();

  const handleJoin: JoinDialogProps['onJoin'] = async ({invitation, secretProvider}) => {
    const party = await client.halo.join(invitation, secretProvider);
    await party.open();
    return party;
  };

  return (
    <JoinDialog {...props} title='Join Halo' onJoin={handleJoin} />
  );
};
