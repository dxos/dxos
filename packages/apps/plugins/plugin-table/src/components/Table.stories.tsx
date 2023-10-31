//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useEffect, useState } from 'react';

import { Table as TableType } from '@braneframe/types';
import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { useClient } from '@dxos/react-client';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { TableComponent } from './TableMain';

faker.seed(1);

const Story = () => {
  const client = useClient();
  const [table, setTable] = useState<TableType>();
  useEffect(() => {
    const space = client.spaces.default;
    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();
    generator.createObjects({ count: 100 });

    const schema = generator.schemas[2];
    const table = space.db.add(new TableType({ schema }));
    setTable(table);
  }, []);

  if (!table) {
    return null;
  }

  return (
    <div className='flex grow p-2'>
      <TableComponent table={table} />
    </div>
  );
};

export default {
  component: TableComponent,
  render: Story,
  decorators: [ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
