//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Toolbar } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { TableColumn } from '@dxos/mosaic';
import { SpaceMember, useMembers } from '@dxos/react-client/echo';

import { MasterDetailTable, PanelContainer } from '../../components';
import { SpaceSelector } from '../../containers';
import { useDevtoolsState } from '../../hooks';
import { textLink } from '../../styles';

const columns: TableColumn<SpaceMember>[] = [
  {
    Header: 'Key',
    width: 80,
    Cell: ({ value }: any) => <div className={mx('font-mono', textLink)}>{value}</div>,
    accessor: (member) => {
      const identityKey = member.identity.identityKey;
      return identityKey.truncate();
    },
  },
  {
    Header: 'Name',
    accessor: (member) => member.identity.profile?.displayName,
  },
  {
    Header: 'Status',
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
        <Toolbar.Root>
          <SpaceSelector />
        </Toolbar.Root>
      }
    >
      <MasterDetailTable<SpaceMember> columns={columns} data={members} />
    </PanelContainer>
  );
};

export default MembersPanel;
