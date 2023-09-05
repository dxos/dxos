//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Toolbar } from '@dxos/aurora';
import { createColumnBuilder, GridColumnDef } from '@dxos/aurora-grid';
import { SpaceMember, useMembers } from '@dxos/react-client/echo';

import { MasterDetailTable, PanelContainer } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

const { helper, builder } = createColumnBuilder<SpaceMember>();
const columns: GridColumnDef<SpaceMember, any>[] = [
  helper.accessor((member) => member.identity.identityKey, { id: 'key', ...builder.key({ tooltip: true }) }),
  helper.accessor((member) => member.identity.profile?.displayName, { id: 'name' }),
  helper.accessor(
    (member) => {
      switch (member.presence) {
        case SpaceMember.PresenceState.ONLINE:
          return 'online';
        case SpaceMember.PresenceState.OFFLINE:
          return 'offline';
      }
    },
    { id: 'status' },
  ),
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
