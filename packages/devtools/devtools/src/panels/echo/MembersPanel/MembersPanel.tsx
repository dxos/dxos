//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { SpaceMember, useMembers } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

const { helper, builder } = createColumnBuilder<SpaceMember>();
const columns: TableColumnDef<SpaceMember, any>[] = [
  helper.display(builder.selectRow()),
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
