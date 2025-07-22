//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { type EchoSchema, isMutable } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { Filter, useQuery, live } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { defaultRowSize, Grid, type GridEditing } from '@dxos/react-ui-grid';
import { createDefaultSchema, DataType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TableCellEditor, type TableCellEditorProps } from './TableCellEditor';
import { useTableModel } from '../../hooks';
import { type TableFeatures } from '../../model';
import { translations } from '../../translations';
import { TableView } from '../../types';
import { createTable } from '../../util';

type StoryProps = {
  editing: GridEditing;
};

const DefaultStory = ({ editing }: StoryProps) => {
  const { space } = useClientProvider();
  invariant(space);

  const views = useQuery(space, Filter.type(DataType.View));
  const [view, setView] = useState<DataType.View>();
  const [schema, setSchema] = useState<EchoSchema>();
  useEffect(() => {
    if (space && views.length && !view) {
      const view = views[0];
      setView(view);
      setSchema(space.db.schemaRegistry.getSchema(view.query.typename!));
    }
  }, [space, views, view]);

  const features: Partial<TableFeatures> = useMemo(
    () => ({
      selection: { enabled: true, mode: 'multiple' },
      dataEditable: true,
      schemaEditable: schema && isMutable(schema),
    }),
    [schema],
  );

  const model = useTableModel({ view, schema: schema?.jsonSchema, features });

  const handleQuery: TableCellEditorProps['onQuery'] = async ({ field }) => {
    // TODO(dmaretskyi): If no schema query nothing
    const { objects } = await space.db.query(schema ? Filter.type(schema) : Filter.everything()).run();
    return objects.map((obj) => {
      const label = obj[field.referencePath ?? 'id'];
      return {
        label,
        data: obj,
      };
    });
  };

  if (!model || !schema || !view) {
    return <div />;
  }

  return (
    <div className='flex w-[300px] border border-separator' style={{ height: defaultRowSize }}>
      <Grid.Root id='test' editing={editing}>
        <TableCellEditor model={model} onQuery={handleQuery} />
      </Grid.Root>
    </div>
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-table/TableCellEditor',
  component: DefaultStory,
  render: DefaultStory,
  parameters: { translations, layout: 'centered' },
  decorators: [
    withClientProvider({
      types: [DataType.View, TableView],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ client, space }) => {
        const schema = createDefaultSchema();
        const { view } = await createTable({ client, space, typename: schema.typename });
        space.db.add(view);
        Array.from({ length: 10 }).forEach(() => {
          space.db.add(
            live(schema, {
              title: faker.person.fullName(),
              status: faker.helpers.arrayElement(['todo', 'in-progress', 'done'] as const),
              description: faker.lorem.sentence(),
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
      cellElement: null,
    },
  },
};
