//
// Copyright 2020 DXOS.org
//

import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { Grid, GridColumnDef, createColumnBuilder } from '@dxos/aurora-grid';
import { PublicKey } from '@dxos/keys';
import { Space, useSpaces } from '@dxos/react-client/echo';

import { PanelContainer } from '../../../components';
import { useDevtoolsDispatch } from '../../../hooks';

export const SpaceListPanel: FC = () => {
  const spaces = useSpaces({ all: true });
  const navigate = useNavigate();
  const setState = useDevtoolsDispatch();

  const handleSelect = (selection: Space[] | undefined) => {
    setState((state) => ({ ...state, space: selection?.[0] }));
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
  const columns: GridColumnDef<Space, any>[] = [
    helper.accessor('key', builder.key({ tooltip: true })),
    helper.accessor((space) => space.properties.name, { id: 'name' }),
    helper.accessor((space) => space.db.objects.length, {
      id: 'objects',
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
    <PanelContainer className='overflow-auto'>
      <Grid<Space> columns={columns} data={spaces} onSelectedChange={handleSelect} />
    </PanelContainer>
  );
};
