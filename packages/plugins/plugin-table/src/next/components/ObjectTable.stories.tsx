//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useEffect, useState } from 'react';

import { TypedObject, S } from '@dxos/echo-schema';
import { Filter, create, useSpaces, useQuery } from '@dxos/react-client/echo';
import { type WithClientProviderProps, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ObjectTable } from './ObjectTable';
import { TableType } from '../../types';

const useStoredTable = () => {
  const spaces = useSpaces();
  const [table, setTable] = useState<TableType | undefined>();
  const objects = useQuery(spaces[spaces.length - 1], Filter.schema(TableType));

  useEffect(() => {
    if (objects.length) {
      setTable(objects[0]);
    }
  }, [objects]);

  return table;
};

const Story = () => {
  const table = useStoredTable();
  if (!table) {
    return null;
  }

  return <ObjectTable table={table} />;
};

export default {
  title: 'plugin-table/ObjectTable-Next',
  component: ObjectTable,
  render: () => <Story />,
};

const clientProps: WithClientProviderProps = {
  types: [TableType],
  createIdentity: true,
  createSpace: true,
  onSpaceCreated: ({ space }) => {
    const tableObj = create(TableType, {
      name: 'Test Table',
      props: [
        { id: 'title', label: 'Title' },
        { id: 'description', label: 'Description' },
        { id: 'count', label: 'Count' },
      ],
    });

    const table = space.db.add(tableObj);

    const schema = TypedObject({ typename: 'example.com/type/start-table-schema', version: '0.1.0' })({
      title: S.optional(S.String),
      description: S.optional(S.String),
      count: S.optional(S.Number),
    });

    table.schema = space.db.schema.addSchema(schema);
  },
};

export const Default = {
  decorators: [withClientProvider(clientProps), withTheme, withLayout({ fullscreen: true })],
};
