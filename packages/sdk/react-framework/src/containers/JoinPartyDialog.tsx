//
// Copyright 2020 DXOS.org
//

import { useClient } from '@dxos/react-client';
import React from 'react';

import { JoinDialog, JoinDialogProps } from './common';

/**
 * Manages the workflow of joining a Party invitation.
 */
export const JoinPartyDialog = (props: Omit<JoinDialogProps, 'onJoin' | 'title'>) => {
  const client = useClient();

  const handleJoin: JoinDialogProps['onJoin'] = async (invitation, secretProvider) => {
    const party = await client.echo.joinParty(invitation, secretProvider);
    await party.open();
    return party;
  }

  return (
    <JoinDialog {...props} title='Join Party' onJoin={handleJoin} />
  );
};
