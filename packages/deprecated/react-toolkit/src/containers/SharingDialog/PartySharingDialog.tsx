//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Invitation } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { useMembers, useSpace, useSpaceInvitations } from '@dxos/react-client';

import { SharingDialog, SharingDialogProps } from './SharingDialog';

export interface PartySharingDialogProps
  extends Omit<
    SharingDialogProps,
    'title' | 'members' | 'onCreateInvitation' | 'onCancelInvitation' | 'onCreateBotInvitation'
  > {
  partyKey: PublicKey;
}

/**
 * Manages the workflow for inviting a user to a party.
 * @deprecated
 */
export const PartySharingDialog = ({ partyKey, ...props }: PartySharingDialogProps) => {
  const party = useSpace(partyKey);
  const members = useMembers(partyKey);
  const _invitations = useSpaceInvitations(partyKey);
  // const botClient = useBotFactoryClient(false);

  const handleCreateInvitation = async () => {
    await party!.createInvitation();
    throw new Error('Not implemented.');
  };

  const handleCancelInvitation = async (invitation: Invitation) => {
    // TODO(burdon): Get observable from useInvitations.
    throw new Error('Not implemented.');
  };

  // const handleBotInvitation = botClient
  //   ? async (resource: ResourceSet) => {
  //       await botClient!.spawn({ name: resource.name.toString() }, party!);
  //     }
  //   : undefined;

  if (!party) {
    return null;
  }

  return (
    <SharingDialog
      {...props}
      title='Party Sharing'
      members={members}
      invitations={[]}
      onCreateInvitation={handleCreateInvitation}
      onCancelInvitation={handleCancelInvitation}
      // onCreateBotInvitation={handleBotInvitation}
    />
  );
};
