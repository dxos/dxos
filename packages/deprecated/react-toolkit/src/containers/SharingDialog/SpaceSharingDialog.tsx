//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Invitation } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { useMembers, useSpace, useSpaceInvitations } from '@dxos/react-client';

import { SharingDialog, SharingDialogProps } from './SharingDialog';

export interface SpaceSharingDialogProps
  extends Omit<
    SharingDialogProps,
    'title' | 'members' | 'onCreateInvitation' | 'onCancelInvitation' | 'onCreateBotInvitation'
  > {
  spaceKey: PublicKey;
}

/**
 * Manages the workflow for inviting a user to a space.
 * @deprecated
 */
export const SpaceSharingDialog = ({ spaceKey, ...props }: SpaceSharingDialogProps) => {
  const space = useSpace(spaceKey);
  const members = useMembers(spaceKey);
  const _invitations = useSpaceInvitations(spaceKey);
  // const botClient = useBotFactoryClient(false);

  const handleCreateInvitation = async () => {
    await space!.createInvitation();
    throw new Error('Not implemented.');
  };

  const handleCancelInvitation = async (invitation: Invitation) => {
    // TODO(burdon): Get observable from useInvitations.
    throw new Error('Not implemented.');
  };

  // const handleBotInvitation = botClient
  //   ? async (resource: ResourceSet) => {
  //       await botClient!.spawn({ name: resource.name.toString() }, space!);
  //     }
  //   : undefined;

  if (!space) {
    return null;
  }

  return (
    <SharingDialog
      {...props}
      title='Space Sharing'
      members={members}
      invitations={[]}
      onCreateInvitation={handleCreateInvitation}
      onCancelInvitation={handleCancelInvitation}
      // onCreateBotInvitation={handleBotInvitation}
    />
  );
};
