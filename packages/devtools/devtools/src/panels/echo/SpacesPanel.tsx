//
// Copyright 2020 DXOS.org
//

import React, { FC } from 'react';

import { Button } from '@dxos/aurora';
import { PublicKey } from '@dxos/keys';
import { Table, TableColumn } from '@dxos/mosaic';
import { Space, useSpaces } from '@dxos/react-client/echo';

import { PanelContainer, Toolbar } from '../../components';

const SpacesPanel: FC = () => {
  const spaces = useSpaces({ all: true });

  const handleToggleOpen = async (spaceKey: PublicKey) => {
    const space = spaces.find((space) => space.key.equals(spaceKey))!;
    if (space.isOpen) {
      await space.internal.deactivate();
    } else {
      await space.internal.activate();
    }
  };

  // TOOD(burdon): Select space.
  // TODO(burdon): Add fields.
  // TODO(burdon): Make Cell monospace by default.
  const columns: TableColumn<Space>[] = [
    {
      Header: 'Key',
      width: 80,
      Cell: ({ value }: any) => <div className='font-mono'>{value.truncate()}</div>,
      accessor: 'key',
    },
    {
      Header: 'Name',
      width: 80,
      Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
      accessor: (space) => space.properties.name,
    },
    {
      Header: 'Open',
      width: 80,
      Cell: ({ value }: any) => <div className='font-mono'>{String(value)}</div>,
      accessor: 'isOpen',
    },
    {
      Header: 'Action',
      width: 80,
      Cell: ({ value, row: { values } }: any) => (
        <Button onClick={() => handleToggleOpen(values.key)}>{value ? 'Close' : 'Open'}</Button>
      ),
      accessor: (space) => space.isOpen,
    },
  ];

  // TODO(burdon): Aligned rows center by default.
  return (
    <PanelContainer className='overflow-auto' toolbar={<Toolbar></Toolbar>}>
      <Table compact columns={columns} data={spaces} />;
    </PanelContainer>
  );
};

export default SpacesPanel;
