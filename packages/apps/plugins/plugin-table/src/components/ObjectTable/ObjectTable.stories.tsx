//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useEffect, useState } from 'react';

import { Table as TableType } from '@braneframe/types';
import { createSpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { useClient } from '@dxos/react-client';
import { ClientRepeater, FullscreenDecorator } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { ObjectTable } from './ObjectTable';

faker.seed(1);

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
  title: 'plugin-table/ObjectTable',
  component: ObjectTable,
  // TODO(burdon): createIdentity doesn't work.
  render: () => <ClientRepeater Component={Story} createIdentity createSpace />,
  decorators: [withTheme, FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
