//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { invitationObservable, Space } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { JoinDialog, JoinDialogProps } from './JoinDialog';

export interface JoinSpaceDialogProps extends Omit<JoinDialogProps, 'onJoin' | 'title'> {
  onJoin?: (space: Space) => Promise<void> | void;
}

/**
 * Manages the workflow of joining a Space invitation.
 */
export const JoinSpaceDialog = ({ onJoin, ...props }: JoinSpaceDialogProps) => {
  const client = useClient();

  const handleJoin: JoinDialogProps['onJoin'] = async ({ invitation, secretProvider }) => {
    const observable = await client.echo.acceptInvitation(invitation);
    await invitationObservable(observable);
    // acceptedInvitation.authenticate(await secretProvider());
    // const space = await acceptedInvitation.getSpace();
    // await onJoin?.(space);
  };

  return <JoinDialog {...props} title='Join Space' onJoin={handleJoin} />;
};
