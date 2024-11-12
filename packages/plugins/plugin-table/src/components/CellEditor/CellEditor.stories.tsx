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

import { CellEditor, type CellEditorProps } from './CellEditor';
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

  const handleComplete: CellEditorProps['onComplete'] = async (field, text) => {
    const { objects } = await space.db.query(schema).run();
    // TODO(burdon): Better fallback property.
    return objects.map((obj) => obj[field.field.referencePath ?? 'id']);
  };

  if (!model || !schema || !table) {
    return <div />;
  }

  return (
    <div className='flex w-[300px] h-[100px] border border-separator'>
      <Grid.Root id='test'>
        <CellEditor model={model} editing={editing} onComplete={handleComplete} />
      </Grid.Root>
    </div>
  );
};

const meta: Meta<StoryProps> = {
  title: 'plugins/plugin-table/CellEditor',
  component: CellEditor,
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
      initialContent: '',
    },
  },
};
