//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { Filter, create, useSpaces, useQuery } from '@dxos/react-client/echo';
import { type WithClientProviderProps, withClientProvider, withMultiClientProvider } from '@dxos/react-client/testing';
import { Table } from '@dxos/react-ui-table';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ObjectTable } from './ObjectTable';
import { TableType } from '../../types';

faker.seed(1);

const useTable = () => {
  const spaces = useSpaces();
  const [table, setTable] = useState<TableType>();
  const objects = useQuery(spaces[spaces.length - 1], Filter.schema(TableType));
  useEffect(() => {
    if (objects.length) {
      setTable(objects[0]);
    }
  }, [objects]);
  return table;
};

const Story = () => {
  const table = useTable();
  if (!table) {
    return null;
  }

  return (
    <Table.Root>
      <Table.Viewport>
        <ObjectTable table={table} stickyHeader />
      </Table.Viewport>
    </Table.Root>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-table/ObjectTable',
  component: ObjectTable,
  // render: () => <div>s</div>,
  render: () => <Story />,
};

const clientProps: WithClientProviderProps = {
  types: [TableType],
  createIdentity: true,
  createSpace: true,
  onSpaceCreated: ({ space }) => {
    // TODO(burdon): Create and set schema.
    space.db.add(create(TableType, { name: 'Test', props: [] }));
  },
};

export const Default = {
  decorators: [withClientProvider(clientProps), withTheme, withLayout({ fullscreen: true })],
};

export const Multiple = {
  decorators: [
    withMultiClientProvider({ ...clientProps, numClients: 3 }),
    withTheme,
    withLayout({ fullscreen: true, classNames: 'grid grid-cols-3' }),
  ],
};
export default meta;
