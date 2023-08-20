//
// Copyright 2020 DXOS.org
//

import { Check, X } from '@phosphor-icons/react';
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Grid,
  GridColumn,
  createCheckColumn,
  createColumn,
  createNumberColumn,
  createKeyColumn,
  createTextColumn,
  defaultGridSlots,
} from '@dxos/aurora-grid';
import { getSize, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { TableColumn } from '@dxos/mosaic';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { Space, useSpaces } from '@dxos/react-client/echo';
import { humanize } from '@dxos/util';

import { PanelContainer } from '../../components';
import { useDevtoolsDispatch } from '../../hooks';
import { textLink } from '../../styles';

const SpacesPanel: FC = () => {
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

  // TODO(burdon): Select space.
  // TODO(burdon): Add fields.
  // TODO(burdon): Make Cell monospace by default.
  const columns: TableColumn<Space>[] = [
    {
      Header: 'Key',
      width: 80,
      Cell: ({
        value,
        row: {
          values: { key },
        },
      }: any) => (
        <div className={mx('font-mono', textLink)} onClick={() => handleSelect(key)}>
          {value.truncate()}
        </div>
      ),
      accessor: 'key',
    },
    {
      Header: 'State',
      width: 40,
      Cell: ({ value }: any) => <div className='font-mono'>{SpaceState[value]}</div>,
      accessor: (space) => space.state.get(),
    },
    {
      id: 'open',
      width: 80,
      Cell: ({
        value,
        row: {
          values: { key },
        },
      }: any) => (
        <div className='flex gap-4 items-center'>
          {value ? (
            <Check className={mx('text-green-500', getSize(5))} />
          ) : (
            <X className={mx('text-red-500', getSize(5))} />
          )}
          <button onClick={() => handleToggleOpen(key)}>{value ? 'Close' : 'Open'}</button>
        </div>
      ),
      accessor: 'isOpen',
    },
    {
      Header: 'Objects',
      width: 60,
      align: 'right',
      Cell: ({ value }: any) => <div className='font-mono'>{value?.toLocaleString()}</div>,
      accessor: (space) => space.db.query().objects.length,
    },
    {
      Header: 'Startup (ms)',
      width: 60,
      align: 'right',
      Cell: ({ value }: any) => <div className='font-mono'>{value?.toLocaleString()}</div>,
      accessor: (space) => {
        const { open, ready } = space.internal.data.metrics ?? {};
        return open && ready && ready.getTime() - open.getTime();
      },
    },
    {
      Header: 'Name',
      width: 120,
      Cell: ({
        value,
        row: {
          values: { key },
        },
      }: any) => <div className='font-mono'>{value ?? humanize(key)}</div>,
      accessor: (space) => space.properties.name,
    },
  ];

  const cols: GridColumn<Space>[] = [
    createKeyColumn('key'),
    createTextColumn('name', {
      value: (space) => space.properties.name,
    }),
    createNumberColumn('objects', {
      value: (space) => space.db.query().objects.length,
      width: 60,
    }),
    createNumberColumn('startup', {
      value: (space) => {
        const { open, ready } = space.internal.data.metrics ?? {};
        return open && ready && ready.getTime() - open.getTime();
      },
      width: 80,
    }),
    createCheckColumn('isOpen', {
      header: {
        label: 'open',
      },
    }),
    // TODO(burdon): Util for button?
    createColumn('action', {
      value: (space) => space.isOpen,
      width: 100,
      header: {
        label: '', // TODO(burdon): placeholder.
      },
      cell: {
        render: ({ value }) => <button>{value ? 'Close' : 'Open'}</button>,
        className: 'text-right',
      },
    }),
  ];

  return (
    <PanelContainer className='overflow-auto'>
      {/* <Table compact slots={{ cell: { className: 'items-center' } }} columns={columns} data={spaces} /> */}

      {/* TODO(burdon): Support non-controlled. */}
      <Grid<Space>
        id='key'
        columns={cols}
        data={spaces}
        onSelectedChange={(selection) => {
          console.log(':::', selection);
        }}
        slots={defaultGridSlots}
      />
    </PanelContainer>
  );
};

export default SpacesPanel;
