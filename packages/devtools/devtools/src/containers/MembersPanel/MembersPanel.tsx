//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { SpaceMember } from '@dxos/protocols/proto/dxos/client';
import { useMembers, useSpaces } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { ColumnType, MasterTable } from '../../components';

export const MembersPanel = () => {
  const spaces = useSpaces();

  const [selectedSpaceKey, setSelectedSpaceKey] = useState<PublicKey>();
  const members = useMembers(selectedSpaceKey ?? spaces[0].key);

  const types: ColumnType<SpaceMember>[] = spaces.map((space) => ({
    id: space.key.toHex(),
    title: humanize(space.key),
    filter: () => true,
    columns: [
      {
        Header: 'Name',
        accessor: (member) => member.profile?.displayName
      },
      {
        Header: 'IdentityKey',
        accessor: (member) => {
          const identityKey = member.identityKey;
          return humanize(identityKey);
        }
      },
      {
        Header: 'Presence',
        accessor: (member) => {
          switch (member.presence) {
            case SpaceMember.PresenceState.ONLINE:
              return 'Online';
            case SpaceMember.PresenceState.OFFLINE:
              return 'Offline';
          }
        }
      }
    ]
  }));

  return (
    <div className='flex ml-2 mr-2'>
      <MasterTable
        types={types}
        data={members}
        onSelectType={(id) => {
          setSelectedSpaceKey(PublicKey.fromHex(id));
        }}
      />
    </div>
  );
};
