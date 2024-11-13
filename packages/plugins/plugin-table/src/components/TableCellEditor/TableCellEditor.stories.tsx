//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useEffect, useMemo, useState } from 'react';

import { type MutableSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { Filter, useSpaces, useQuery, create } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Grid, type GridEditing } from '@dxos/react-ui-grid';
import { ViewProjection, ViewType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TableCellEditor, type TableCellEditorProps } from './TableCellEditor';
import { useTableModel } from '../../hooks';
import translations from '../../translations';
import { TableType } from '../../types';
import { initializeTable } from '../../util';

type StoryProps = {
  editing: GridEditing;
};

const DefaultStory = ({ editing }: StoryProps) => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const tables = useQuery(space, Filter.schema(TableType));
  const [table, setTable] = useState<TableType>();
  const [schema, setSchema] = useState<MutableSchema>();
  useEffect(() => {
    if (tables.length && !table) {
      const table = tables[0];
      invariant(table.view);
      setTable(table);
      setSchema(space.db.schemaRegistry.getSchema(table.view.query.__typename));
    }
  }, [tables]);

  const projection = useMemo(() => {
    if (schema && table?.view) {
      return new ViewProjection(schema, table.view);
    }
  }, [schema, table?.view]);

  const model = useTableModel({ table, projection });

  const handleQuery: TableCellEditorProps['onQuery'] = async ({ field }) => {
    const { objects } = await space.db.query(schema).run();
    return objects.map((obj) => {
      const label = obj[field.referencePath ?? 'id'];
      return {
        label,
        data: obj,
      };
    });
  };

  if (!model || !schema || !table) {
    return <div />;
  }

  return (
    <div className='flex w-[300px] h-[32px] border border-separator'>
      <Grid.Root id='test' editing={editing}>
        <TableCellEditor model={model} onQuery={handleQuery} />
      </Grid.Root>
    </div>
  );
};

const meta: Meta<StoryProps> = {
  title: 'plugins/plugin-table/TableCellEditor',
  component: DefaultStory,
  render: DefaultStory,
  parameters: { translations, layout: 'centered' },
  decorators: [
    withClientProvider({
      types: [TableType, ViewType],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: ({ space }) => {
        const table = space.db.add(create(TableType, {}));
        const schema = initializeTable({ space, table });
        Array.from({ length: 10 }).forEach(() => {
          space.db.add(
            create(schema, {
              name: faker.person.fullName(),
            }),
          );
        });
      },
    }),
    withTheme,
    withLayout({ tooltips: true }),
  ],
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  args: {
    editing: {
      index: '0,3',
      initialContent: 'Test',
    },
  },
};
