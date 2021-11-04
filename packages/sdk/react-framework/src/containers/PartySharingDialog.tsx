//
// Copyright 2020 DXOS.org
//

import type { PublicKey } from '@dxos/crypto';
import { useClient, useMembers, useParty } from '@dxos/react-client';
import { assert } from 'console';
import React from 'react';

import { SharingDialog, SharingDialogProps } from './common';

export interface PartySharingDialogProps extends Omit<SharingDialogProps, 'onShare' | 'title' | 'members'> {
  partyKey: PublicKey,
}

/**
 * Manages the workflow for inviting a user to a party.
 */
export const PartySharingDialog = ({partyKey, ...props}: PartySharingDialogProps) => {
  const client = useClient();
  const party = useParty(partyKey);
  const members = useMembers(party);

  const handleShare: SharingDialogProps['onShare'] = async ({options, secretProvider}) => {
    assert(party, 'Party not found');
    // TODO(burdon): Handle offline (display members).
    return await client.createInvitation(partyKey!, secretProvider, options);
  };



  return (
    <SharingDialog {...props} title='Party Sharing' onShare={handleShare} members={members} />
  );
};
