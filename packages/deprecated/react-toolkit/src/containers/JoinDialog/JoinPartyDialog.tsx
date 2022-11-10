//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { invitationObservable, Party } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { JoinDialog, JoinDialogProps } from './JoinDialog';

export interface JoinPartyDialogProps extends Omit<JoinDialogProps, 'onJoin' | 'title'> {
  onJoin?: (party: Party) => Promise<void> | void;
}

/**
 * Manages the workflow of joining a Party invitation.
 */
export const JoinPartyDialog = ({ onJoin, ...props }: JoinPartyDialogProps) => {
  const client = useClient();

  const handleJoin: JoinDialogProps['onJoin'] = async ({ invitation, secretProvider }) => {
    const observable = await client.echo.acceptInvitation(invitation);
    await invitationObservable(observable);
    // acceptedInvitation.authenticate(await secretProvider());
    // const party = await acceptedInvitation.getParty();
    // await onJoin?.(party);
  };

  return <JoinDialog {...props} title='Join Party' onJoin={handleJoin} />;
};
