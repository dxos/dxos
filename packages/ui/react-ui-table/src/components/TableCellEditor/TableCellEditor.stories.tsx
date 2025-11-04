//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Obj, Type } from '@dxos/echo';
import { faker } from '@dxos/random';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
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
        <TableCellEditor model={model} schema={DataType.Task.Task} />
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
    withClientProvider({
      types: [DataType.View, DataType.Task.Task, Table.Table],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ client, space }) => {
        const { view } = await Table.makeView({ client, space, typename: DataType.Task.Task.typename });
        space.db.add(view);
        Array.from({ length: 10 }).forEach(() => {
          space.db.add(
            Obj.make(DataType.Task.Task, {
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
    translations,
    layout: 'centered',
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
