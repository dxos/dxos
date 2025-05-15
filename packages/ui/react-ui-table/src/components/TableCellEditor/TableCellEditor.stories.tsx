//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useEffect, useMemo, useState } from 'react';

import { ImmutableSchema, type EchoSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { Filter, useQuery, live } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { defaultSizeRow, Grid, type GridEditing } from '@dxos/react-ui-grid';
import { ViewProjection, ViewType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TableCellEditor, type TableCellEditorProps } from './TableCellEditor';
import { useTableModel } from '../../hooks';
import { type TableFeatures } from '../../model';
import translations from '../../translations';
import { TableType } from '../../types';
import { initializeTable } from '../../util';

type StoryProps = {
  editing: GridEditing;
};

const DefaultStory = ({ editing }: StoryProps) => {
  const { space } = useClientProvider();
  invariant(space);

  const tables = useQuery(space, Filter.type(TableType));
  const [table, setTable] = useState<TableType>();
  const [schema, setSchema] = useState<EchoSchema>();
  useEffect(() => {
    if (space && tables.length && !table) {
      const table = tables[0];
      invariant(table.view);
      setTable(table);
      setSchema(space.db.schemaRegistry.getSchema(table.view.target!.query.typename!));
    }
  }, [space, tables]);

  const projection = useMemo(() => {
    if (schema && table?.view) {
      return new ViewProjection(schema.jsonSchema, table.view.target!);
    }
  }, [schema, table?.view]);

  const features: Partial<TableFeatures> = useMemo(
    () => ({
      selection: { enabled: true, mode: 'multiple' },
      dataEditable: true,
      schemaEditable: !(schema instanceof ImmutableSchema),
    }),
    [],
  );

  const model = useTableModel({ table, projection, features });

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
    <div className='flex w-[300px] border border-separator' style={{ height: defaultSizeRow }}>
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
      onSpaceCreated: async ({ client, space }) => {
        const table = space.db.add(live(TableType, {}));
        const schema = await initializeTable({ client, space, table });
        Array.from({ length: 10 }).forEach(() => {
          space.db.add(
            live(schema, {
              name: faker.person.fullName(),
            }),
          );
        });
      },
    }),
    withTheme,
    withLayout(),
  ],
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  args: {
    editing: {
      index: 'grid,0,3',
      initialContent: 'Test',
    },
  },
};
