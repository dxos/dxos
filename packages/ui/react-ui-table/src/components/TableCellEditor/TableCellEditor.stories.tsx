//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Grid, type GridEditing, defaultRowSize } from '@dxos/react-ui-grid';
import { View } from '@dxos/schema';
import { Task } from '@dxos/types';

import { useTestTableModel } from '../../testing';
import { translations } from '../../translations';
import { Table } from '../../types';

import { TableCellEditor } from './TableCellEditor';

type StoryProps = {
  editing: GridEditing;
};

// TODO(burdon): Broken layout.
const DefaultStory = ({ editing }: StoryProps) => {
  const { model, table } = useTestTableModel();

  if (!model || !table) {
    return <div />;
  }

  return (
    <div className='border border-separator' style={{ height: defaultRowSize }}>
      <Grid.Root id='test' editing={editing}>
        <TableCellEditor model={model} schema={Task.Task} />
      </Grid.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-table/TableCellEditor',
  component: DefaultStory,
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ container: 'column' }),
    withClientProvider({
      types: [View.View, Task.Task, Table.Table],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const { view, jsonSchema } = await View.makeFromSpace({ space, typename: Task.Task.typename });
        const table = Table.make({ view, jsonSchema });
        space.db.add(table);
        Array.from({ length: 10 }).forEach(() => {
          space.db.add(
            Obj.make(Task.Task, {
              title: faker.person.fullName(),
              status: faker.helpers.arrayElement(['todo', 'in-progress', 'done'] as const),
              description: faker.lorem.sentence(),
            }),
          );
        });
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    editing: {
      index: 'grid,0,3',
      initialContent: 'Test',
      cellElement: null,
    },
  },
};
