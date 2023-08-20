//
// Copyright 2020 DXOS.org
//

import React, { FC, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Grid,
  GridColumn,
  createBooleanColumn,
  createColumn,
  createNumberColumn,
  createKeyColumn,
  createTextColumn,
  defaultGridSlots,
} from '@dxos/aurora-grid';
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

  const columns: GridColumn<Space>[] = useMemo(
    () => [
      createKeyColumn('key', { key: true }),
      createTextColumn('name', {
        accessor: (space) => space.properties.name,
      }),
      createNumberColumn('objects', {
        accessor: (space) => space.db.query().objects.length,
        width: 60,
      }),
      createNumberColumn('startup', {
        accessor: (space) => {
          const { open, ready } = space.internal.data.metrics ?? {};
          return open && ready && ready.getTime() - open.getTime();
        },
        width: 80,
      }),
      createBooleanColumn('open', {
        accessor: 'isOpen',
      }),
      // TODO(burdon): Util for button?
      createColumn('action', {
        accessor: 'isOpen',
        width: 60,
        header: {
          label: '', // TODO(burdon): placeholder.
        },
        cell: {
          render: ({ value, row }) => (
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                void handleToggleOpen(row.key);
              }}
            >
              {value ? 'Close' : 'Open'}
            </button>
          ),
          className: 'text-right',
        },
      }),
    ],
    [],
  );

  return (
    <PanelContainer className='overflow-auto'>
      <Grid<Space>
        columns={columns}
        data={spaces}
        onSelect={(selection) => {
          handleSelect(PublicKey.from(selection));
        }}
        slots={defaultGridSlots}
      />
    </PanelContainer>
  );
};
