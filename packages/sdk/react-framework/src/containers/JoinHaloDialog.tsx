//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';

import { JoinDialog, JoinDialogProps } from './JoinDialog';

export type JoinHaloDialogProps = Omit<JoinDialogProps, 'onJoin' | 'title'>

/**
 * Manages the workflow of joining a HALO invitation.
 */
export const JoinHaloDialog = (props: JoinHaloDialogProps) => {
  const client = useClient();

  const handleJoin: JoinDialogProps['onJoin'] = async ({ invitation, secretProvider }) => {
    const finishInvitation = await client.joinHaloInvitation(invitation);
    const secret = await secretProvider();
    await finishInvitation(secret.toString());
  };

  return (
    <JoinDialog
      {...props}
      title='Join Halo'
      onJoin={handleJoin}
    />
  );
};
