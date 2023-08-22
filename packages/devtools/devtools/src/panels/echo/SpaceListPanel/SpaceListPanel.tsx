//
// Copyright 2020 DXOS.org
//

import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { Grid, GridColumnDef, defaultGridSlots, createColumnBuilder } from '@dxos/aurora-grid';
import { PublicKey } from '@dxos/keys';
import { Space, useSpaces } from '@dxos/react-client/echo';

import { PanelContainer } from '../../../components';
import { useDevtoolsDispatch } from '../../../hooks';

export const SpaceListPanel: FC = () => {
  const spaces = useSpaces({ all: true });
  const navigate = useNavigate();
  const setState = useDevtoolsDispatch();

  const handleSelect = (spaceKey: PublicKey) => {
    setState((state) => ({
      ...state,
      space: spaces.find((space) => space.key.equals(spaceKey))!,
    }));
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
    helper.accessor('key', builder.createKeyCell({ tooltip: true })),
    helper.accessor((space) => space.properties.name, { id: 'name' }),
    helper.accessor((space) => space.db.objects.length, {
      id: 'objects',
      ...builder.createNumberCell(),
    }),
    helper.accessor(
      (space) => {
        const { open, ready } = space.internal.data.metrics ?? {};
        return open && ready && ready.getTime() - open.getTime();
      },
      {
        id: 'startup',
        ...builder.createNumberCell(),
      },
    ),
    helper.accessor('isOpen', { header: 'open', ...builder.createIconCell() }),
  ];

  return (
    <PanelContainer className='overflow-auto'>
      <Grid<Space>
        columnDefs={columns}
        data={spaces}
        onSelect={(selection) => {
          handleSelect(PublicKey.from(selection));
        }}
        slots={defaultGridSlots}
      />
    </PanelContainer>
  );
};
