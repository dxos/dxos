//
// Copyright 2022 DXOS.org
//

import { Smiley, SmileyBlank, UserCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { SpaceMember } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { getSize, mx } from '@dxos/react-components';

export const MemberList: FC<{ identityKey: PublicKey; members: SpaceMember[] }> = ({ identityKey, members }) => {
  members.sort((member) => (member.identityKey.equals(identityKey) ? -1 : 1));

  return (
    <div className='flex flex-1 flex-col overflow-hidden pr-4'>
      {members.map((member) => (
        <div key={member.identityKey.toHex()} className='flex overflow-hidden mb-1 items-center'>
          <div className='mr-3'>
            {member.identityKey.equals(identityKey) ? (
              <UserCircle className={mx(getSize(6), 'text-selection-text')} />
            ) : member.presence === SpaceMember.PresenceState.ONLINE ? (
              <Smiley className={mx(getSize(6), 'text-green-500')} />
            ) : (
              <SmileyBlank className={mx(getSize(6), 'text-slate-500')} />
            )}
          </div>
          <div className='overflow-hidden text-ellipsis whitespace-nowrap font-mono'>
            {member.profile?.displayName ?? member.identityKey.truncate()}
          </div>
        </div>
      ))}
    </div>
  );
};
