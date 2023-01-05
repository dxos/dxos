//
// Copyright 2022 DXOS.org
//

import { Smiley, SmileyBlank, UserCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { SpaceMember } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { useClient, useMembers } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-ui';

export const MemberList: FC<{ spaceKey: PublicKey }> = ({ spaceKey }) => {
  const client = useClient();
  const members = useMembers(spaceKey);
  members.sort((a) => (a.identityKey.equals(client.halo.profile!.identityKey) ? -1 : 1));

  return (
    <div className='flex flex-1 flex-col'>
      {members.map((member) => (
        <div key={member.identityKey.toHex()} className='flex mb-1 items-center'>
          <div className='mr-3'>
            {member.identityKey.equals(client.halo.profile!.identityKey) ? (
              <UserCircle className={mx(getSize(6), 'text-orange-500')} />
            ) : member.presence === SpaceMember.PresenceState.ONLINE ? (
              <Smiley className={mx(getSize(6), 'text-green-500')} />
            ) : (
              <SmileyBlank className={mx(getSize(6), 'text-slate-500')} />
            )}
          </div>
          <div className='font-mono text-slate-300'>{member.identityKey.truncate()}</div>
        </div>
      ))}
    </div>
  );
};
