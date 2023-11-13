//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useEffect, useState } from 'react';

import { Table as TableType } from '@braneframe/types';
import { createSpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { useClient } from '@dxos/react-client';
import { ClientSpaceDecorator, FullscreenDecorator } from '@dxos/react-client/testing';

import { ObjectTable } from './ObjectTable';

faker.seed(1);

// TODO(burdon): Move into ClientSpaceDecorator callback.
const Story = () => {
  const client = useClient();
  const [table, setTable] = useState<TableType>();
  useEffect(() => {
    const space = client.spaces.default;
    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();
    generator.createObjects({ [TestSchemaType.organization]: 20 });

    const schema = generator.getSchema(TestSchemaType.organization);
    const table = space.db.add(new TableType({ schema }));
    setTable(table);
  }, []);

  if (!table) {
    return null;
  }

  return <ObjectTable table={table} />;
};

export default {
  component: ObjectTable,
  render: Story,
  decorators: [FullscreenDecorator(), ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
