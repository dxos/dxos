//
// Copyright 2020 DXOS.org
//

import React, { type FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { type PublicKey } from '@dxos/keys';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { Table, type TableColumnDef, createColumnBuilder } from '@dxos/react-ui-table';

import { PanelContainer } from '../../../components';
import { useDevtoolsDispatch } from '../../../hooks';

export const SpaceListPanel: FC = () => {
  const spaces = useSpaces({ all: true });
  const navigate = useNavigate();
  const setState = useDevtoolsDispatch();

  const handleSelect = (selection: Space | undefined) => {
    setState((state) => ({ ...state, space: selection }));
    navigate('/echo/space');
  };

  const handleToggleOpen = async (spaceKey: PublicKey) => {
    const space = spaces.find((space) => space.key.equals(spaceKey))!;
    if (space.isOpen) {
      await space.internal.close();
    } else {
      await space.internal.open();
    }
  };

  // TODO(burdon): Get builder from hook.
  const { helper, builder } = createColumnBuilder<Space>();
  const columns: TableColumnDef<Space, any>[] = [
    helper.accessor('key', builder.key({ tooltip: true })),
    helper.accessor((space) => space.properties.name, { id: 'name' }),
    helper.accessor((space) => space.db.objects.length, {
      id: 'objects',
      ...builder.number(),
    }),
    helper.accessor((space) => space.members.get().length, {
      id: 'members',
      ...builder.number(),
    }),
    helper.accessor(
      (space) => {
        const { open, ready } = space.internal.data.metrics ?? {};
        return open && ready && ready.getTime() - open.getTime();
      },
      {
        id: 'startup',
        ...builder.number({ size: 80 }),
      },
    ),
    helper.accessor('isOpen', { header: 'open', ...builder.icon() }),
    helper.display({
      id: 'open',
      cell: (context) => (
        <button
          onClick={(event) => {
            event.stopPropagation();
            void handleToggleOpen(context.row.original.key);
          }}
        >
          {context.row.original.isOpen ? 'Close' : 'Open'}
        </button>
      ),
    }),
  ];

  return (
    <PanelContainer classNames='overflow-auto'>
      <Table<Space> columns={columns} data={spaces} onDatumClick={handleSelect} fullWidth />
    </PanelContainer>
  );
};
