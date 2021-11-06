//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';

import { JoinDialog, JoinDialogProps } from './JoinDialog';

/**
 * Manages the workflow of joining a Party invitation.
 */
export const JoinPartyDialog = (props: Omit<JoinDialogProps, 'onJoin' | 'title'>) => {
  const client = useClient();

  const handleJoin: JoinDialogProps['onJoin'] = async ({ invitation, secretProvider }) => {
    const party = await client.echo.joinParty(invitation, secretProvider);
    await party.open();
    return party;
  };

  return (
    <JoinDialog
      {...props}
      title='Join Party'
      onJoin={handleJoin}
    />
  );
};
