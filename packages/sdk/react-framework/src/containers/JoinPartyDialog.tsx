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
    const redeemeingInvitation = client.echo.acceptInvitation(invitation);
    redeemeingInvitation.authenticate(await secretProvider());
    await redeemeingInvitation.getParty();
  };

  return (
    <JoinDialog
      {...props}
      title='Join Party'
      onJoin={handleJoin}
    />
  );
};
