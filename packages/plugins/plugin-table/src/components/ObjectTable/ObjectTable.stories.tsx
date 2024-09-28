//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { Filter, create, useSpaces } from '@dxos/react-client/echo';
import { type WithClientProviderProps } from '@dxos/react-client/src/testing';
import { withClientProvider, withMultiClientProvider } from '@dxos/react-client/testing';
import { Table } from '@dxos/react-ui-table';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ObjectTable } from './ObjectTable';
import { TableType } from '../../types';

faker.seed(1);

const useTable = () => {
  const spaces = useSpaces();
  const [table, setTable] = useState<TableType>();
  useEffect(() => {
    const t = setTimeout(async () => {
      if (spaces.length > 1) {
        const space = spaces[1];
        const { objects } = await space.db.query(Filter.schema(TableType)).run();
        if (objects.length) {
          setTable(objects[0]);
        }
      }
    });

    return () => clearTimeout(t);
  }, [spaces]);

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

export default {
  title: 'plugin-table/ObjectTable',
  component: ObjectTable,
  render: Story,
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
  decorators: [withMultiClientProvider({ ...clientProps, numClients: 3 }), withTheme, withLayout({ fullscreen: true })],
};
