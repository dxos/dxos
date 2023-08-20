//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Toolbar } from '@dxos/aurora';
import { createKeyColumn, createTextColumn, GridColumn } from '@dxos/aurora-grid';
import { SpaceMember, useMembers } from '@dxos/react-client/echo';

import { MasterDetailTable, PanelContainer } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

const columns: GridColumn<SpaceMember>[] = [
  createKeyColumn('key', {
    key: true,
    accessor: (member) => {
      return member.identity.identityKey;
    },
  }),
  createTextColumn('name', { accessor: (member) => member.identity.profile?.displayName }),
  createTextColumn('status', {
    accessor: (member) => {
      switch (member.presence) {
        case SpaceMember.PresenceState.ONLINE:
          return 'online';
        case SpaceMember.PresenceState.OFFLINE:
          return 'offline';
      }
    },
  }),
];

export const MembersPanel = () => {
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
