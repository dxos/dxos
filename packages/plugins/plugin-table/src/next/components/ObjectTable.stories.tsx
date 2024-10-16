//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useEffect, useState } from 'react';

import { Filter, useSpaces, useQuery } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ObjectTable } from './ObjectTable';
import { createTable, TestSchema } from './testing';
import { TableType } from '../../types';

const Story = () => {
  const spaces = useSpaces();
  const [table, setTable] = useState<TableType | undefined>();
  const objects = useQuery(spaces[spaces.length - 1], Filter.schema(TableType));
  useEffect(() => {
    if (objects.length) {
      setTable(objects[0]);
    }
  }, [objects]);

  if (!table) {
    return null;
  }

  return <ObjectTable table={table} />;
};

export default {
  title: 'plugin-table/ObjectTable-Next',
  component: ObjectTable,
  decorators: [
    withClientProvider({
      types: [TableType],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: ({ space }) => {
        const schema = space.db.schema.addSchema(TestSchema);
        space.db.add(createTable(schema));
      },
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
  render: Story,
};

export const Default = {};
