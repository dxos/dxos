//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { Column } from 'react-table';

import { SpaceMember } from '@dxos/protocols/proto/dxos/client';
import { useMembers } from '@dxos/react-client';

import { MasterTable } from '../../components';
import { SpaceToolbar } from '../../containers';
import { useDevtoolsState } from '../../hooks';

const columns: Column<SpaceMember>[] = [
  {
    Header: 'key',
    width: 120,
    accessor: (member) => {
      const identityKey = member.identityKey;
      return identityKey.truncate(4);
    }
  },
  {
    Header: 'name',
    accessor: (member) => member.profile?.displayName
  },
  {
    Header: 'status',
    accessor: (member) => {
      switch (member.presence) {
        case SpaceMember.PresenceState.ONLINE:
          return 'online';
        case SpaceMember.PresenceState.OFFLINE:
          return 'offline';
      }
    }
  }
];

const MembersPanel = () => {
  const { space } = useDevtoolsState();
  const members = useMembers(space?.key);

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <SpaceToolbar />

      <div className='flex flex-1'>
        <MasterTable<SpaceMember> columns={columns} data={members} />
      </div>
    </div>
  );
};

export default MembersPanel;
