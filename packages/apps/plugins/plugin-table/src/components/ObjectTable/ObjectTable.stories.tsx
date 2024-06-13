//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { TableType } from '@braneframe/types';
import { createSpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { ClientRepeater, FullscreenDecorator } from '@dxos/react-client/testing';
import { Table } from '@dxos/react-ui-table';
import { withTheme } from '@dxos/storybook-utils';

import { ObjectTable } from './ObjectTable';

faker.seed(1);

const useTable = () => {
  const client = useClient();
  const [table, setTable] = useState<TableType>();

  useEffect(() => {
    const space = client.spaces.default;
    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();
    void generator.createObjects({ [TestSchemaType.project]: 6 }).catch();

    client.addTypes([TableType]);

    // We need a table to reference
    // TODO(zan): Workout how to get this to not double add in debug.
    space.db.add(create(TableType, { title: 'Other table', props: [], schema: generator.schemas[3] }));

    const table = space.db.add(create(TableType, { title: '', props: [] }));
    setTable(table);
  }, []);

  return table;
};

const Story = ({ table }: { table?: TableType }) => {
  if (!table) {
    return null;
  }

  return (
    <Table.Root>
      <Table.Viewport classNames={'inset-0'}>
        <ObjectTable table={table} stickyHeader />
      </Table.Viewport>
    </Table.Root>
  );
};

const SingleTableStory = () => {
  const table = useTable();

  return <Story table={table} />;
};

const MultipleTableStory = () => {
  const table = useTable();

  return (
    <div className='flex flex-col gap-4'>
      <Story table={table} />
      <Story table={table} />
      <Story table={table} />
    </div>
  );
};

export default {
  title: 'plugin-table/ObjectTable',
  component: ObjectTable,
  render: () => <ClientRepeater component={SingleTableStory} createIdentity createSpace />,
  decorators: [withTheme, FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const MultipleTables = () => <ClientRepeater component={MultipleTableStory} createIdentity createSpace />;

MultipleTables.decorators = [withTheme, FullscreenDecorator()];
MultipleTables.parameters = {
  layout: 'fullscreen',
};

export const Default = {};
