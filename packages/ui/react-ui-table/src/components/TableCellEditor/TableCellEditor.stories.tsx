//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { withClientProvider } from '@dxos/react-client/testing';
import { Grid, type GridEditing, defaultRowSize } from '@dxos/react-ui-grid';
import { DataType } from '@dxos/schema';

import { useTestTableModel } from '../../testing';
import { translations } from '../../translations';
import { Table } from '../../types';

import { TableCellEditor } from './TableCellEditor';

type StoryProps = {
  editing: GridEditing;
};

const DefaultStory = ({ editing }: StoryProps) => {
  const { model, view } = useTestTableModel();

  if (!model || !view) {
    return <div />;
  }

  return (
    <div className='flex w-[300px] border border-separator' style={{ height: defaultRowSize }}>
      <Grid.Root id='test' editing={editing}>
        <TableCellEditor model={model} schema={DataType.Task} />
      </Grid.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-table/TableCellEditor',
  component: DefaultStory,
  render: DefaultStory,
  parameters: { translations, layout: 'centered' },
  decorators: [
    withClientProvider({
      types: [DataType.View, DataType.Task, Table.Table],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ client, space }) => {
        const { view } = await Table.makeView({ client, space, typename: DataType.Task.typename });
        space.db.add(view);
        Array.from({ length: 10 }).forEach(() => {
          space.db.add(
            Obj.make(DataType.Task, {
              title: faker.person.fullName(),
              status: faker.helpers.arrayElement(['todo', 'in-progress', 'done'] as const),
              description: faker.lorem.sentence(),
            }),
          );
        });
      },
    }),
  ],
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
