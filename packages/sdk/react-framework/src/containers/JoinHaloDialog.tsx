//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';

import { JoinDialog, JoinDialogProps } from './JoinDialog';
import { encodeInvitation } from '@dxos/client';

export interface JoinHaloDialogProps extends Omit<JoinDialogProps, 'onJoin' | 'title'> {
  remote?: boolean;
}

/**
 * Manages the workflow of joining a HALO invitation.
 */
export const JoinHaloDialog = ({remote, ...props}: JoinHaloDialogProps) => {
  const client = useClient();

  const handleJoin: JoinDialogProps['onJoin'] = async ({ invitation, secretProvider }) => {
    const party = await client.halo.acceptInvitation(invitation, secretProvider);
    await party.open();
    return party;
  };

  const handleRemoteJoin: JoinDialogProps['onJoin'] = async ({ invitation, secretProvider }) => {
    console.log('accepting..')
    const invitationProcess = await client.services.ProfileService.AcceptInvitation({
      invitationCode: encodeInvitation(invitation)
    });
    console.log('authenticating...')
    const profile = await client.services.ProfileService.AuthenticateInvitation({
      process: invitationProcess, secret: (await secretProvider()).toString()
    })
    console.log({profile})
  }

  return (
    <JoinDialog
      {...props}
      title='Join Halo'
      onJoin={remote ? handleRemoteJoin : handleJoin}
    />
  );
};
