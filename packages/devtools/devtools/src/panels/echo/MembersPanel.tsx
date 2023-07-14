//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { TableColumn } from '@dxos/mosaic';
import { SpaceMember } from '@dxos/protocols/proto/dxos/client/services';
import { useMembers } from '@dxos/react-client';

import { MasterDetailTable, PanelContainer, Toolbar } from '../../components';
import { SpaceSelector } from '../../containers';
import { useDevtoolsState } from '../../hooks';

const columns: TableColumn<SpaceMember>[] = [
  {
    Header: 'key',
    width: 120,
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
    accessor: (member) => {
      const identityKey = member.identity.identityKey;
      return identityKey.truncate();
    },
  },
  {
    Header: 'name',
    accessor: (member) => member.identity.profile?.displayName,
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
    },
  },
];

const MembersPanel = () => {
  const { space } = useDevtoolsState();
  const members = useMembers(space?.key);

  return (
    <PanelContainer
      toolbar={
        <Toolbar>
          <SpaceSelector />
        </Toolbar>
      }
    >
      <MasterDetailTable<SpaceMember> columns={columns} data={members} />
    </PanelContainer>
  );
};

export default MembersPanel;
