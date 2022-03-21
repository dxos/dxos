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
    const acceptedInvitation = await client.halo.acceptInvitation(invitation);
    const secret = await secretProvider();
    await acceptedInvitation.authenticate(secret);
  };

  return (
    <JoinDialog
      {...props}
      title='Join Halo'
      onJoin={handleJoin}
    />
  );
};
