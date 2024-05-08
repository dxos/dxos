//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { SpaceMember, useMembers } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef, textPadding } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

const { helper, builder } = createColumnBuilder<SpaceMember>();
const columns: TableColumnDef<SpaceMember, any>[] = [
  helper.accessor((member) => member.identity.identityKey, { id: 'key', ...builder.key({ tooltip: true }) }),
  helper.accessor((member) => member.identity.profile?.displayName, {
    id: 'name',
    meta: { cell: { classNames: textPadding } },
  }),
  helper.accessor(
    (member) => {
      switch (member.presence) {
        case SpaceMember.PresenceState.ONLINE:
          return 'online';
        case SpaceMember.PresenceState.OFFLINE:
          return 'offline';
      }
    },
    {
      id: 'status',
      meta: { cell: { classNames: textPadding } },
    },
  ),
];

export const MembersPanel = () => {
  const { space } = useDevtoolsState();
  const members = useMembers(space?.key);

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <DataSpaceSelector />
        </Toolbar.Root>
      }
    >
      <MasterDetailTable<SpaceMember> columns={columns} data={members} />
    </PanelContainer>
  );
};
