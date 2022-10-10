//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Party } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { JoinDialog, JoinDialogProps } from './JoinDialog.js';

export interface JoinPartyDialogProps extends Omit<JoinDialogProps, 'onJoin' | 'title'> {
  onJoin?: (party: Party) => Promise<void> | void
}

/**
 * Manages the workflow of joining a Party invitation.
 */
export const JoinPartyDialog = ({ onJoin, ...props }: JoinPartyDialogProps) => {
  const client = useClient();

  const handleJoin: JoinDialogProps['onJoin'] = async ({ invitation, secretProvider }) => {
    const redeemeingInvitation = client.echo.acceptInvitation(invitation);
    redeemeingInvitation.authenticate(await secretProvider());
    const party = await redeemeingInvitation.getParty();
    await onJoin?.(party);
  };

  return (
    <JoinDialog
      {...props}
      title='Join Party'
      onJoin={handleJoin}
    />
  );
};
