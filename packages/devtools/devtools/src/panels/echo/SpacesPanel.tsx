//
// Copyright 2020 DXOS.org
//

import { Check, X } from '@phosphor-icons/react';
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { Table, TableColumn } from '@dxos/mosaic';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { Space, useSpaces } from '@dxos/react-client/echo';
import { humanize } from '@dxos/util';

import { PanelContainer, Toolbar } from '../../components';
import { useDevtoolsDispatch } from '../../hooks';

const SpacesPanel: FC = () => {
  const spaces = useSpaces({ all: true });
  const navigate = useNavigate();
  const setState = useDevtoolsDispatch();

  const handleSelect = (spaceKey: PublicKey) => {
    const space = spaces.find((space) => space.key.equals(spaceKey));
    console.log(space?.internal.data?.metrics);

    setState((state) => ({
      ...state,
      space: spaces.find((space) => space.key.equals(spaceKey))!,
    }));
    navigate('/echo/space');
  };

  const handleToggleOpen = async (spaceKey: PublicKey) => {
    const space = spaces.find((space) => space.key.equals(spaceKey))!;
    if (space.isOpen) {
      await space.internal.deactivate();
    } else {
      await space.internal.activate();
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
        <div className='font-mono text-blue-500 cursor-pointer' onClick={() => handleSelect(key)}>
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
          <Button variant='ghost' onClick={() => handleToggleOpen(key)}>
            {value ? 'Close' : 'Open'}
          </Button>
        </div>
      ),
      accessor: 'isOpen',
    },
    {
      Header: 'Startup (ms)',
      width: 60,
      align: 'right',
      Cell: ({ value }: any) => <div className='font-mono'>{value?.toLocaleString()}</div>,
      accessor: (space) => {
        const { open, ready } = space.internal.data.metrics ?? {};
        return open && ready && new Date(ready).getTime() - new Date(open).getTime();
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

  return (
    <PanelContainer className='overflow-auto' toolbar={<Toolbar></Toolbar>}>
      <Table compact slots={{ cell: { className: 'items-center ' } }} columns={columns} data={spaces} />;
    </PanelContainer>
  );
};

export default SpacesPanel;
