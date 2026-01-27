//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { Board as BoardComponent, DebugRoot, TestColumn, TestItem } from '../../testing';
import { Focus } from '../Focus';

import { Mosaic } from './Mosaic';

faker.seed(999);

type StoryProps = {
  columns?: number;
  debug?: boolean;
};

const DefaultStory = ({ debug = false }: StoryProps) => {
  const { space } = useClientStory();
  const columns = useQuery(space?.db, Filter.type(TestColumn));

  if (columns.length === 0) {
    return <></>;
  }

  return (
    <Mosaic.Root asChild debug={debug}>
      <div className={mx('grid overflow-hidden', debug && 'grid-cols-[1fr_20rem] gap-2')}>
        <BoardComponent id='board' columns={columns} debug={debug} />
        {debug && (
          <Focus.Group classNames='flex flex-col gap-2 overflow-hidden'>
            <DebugRoot classNames='p-2' />
          </Focus.Group>
        )}
      </div>
    </Mosaic.Root>
  );
};

const meta = {
  title: 'ui/react-ui-mosaic/Mosaic',
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      types: [TestColumn, TestItem],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: ({ space }, context) => {
        const columnCount = (context.args as StoryProps).columns ?? 4;
        createTestData(space.db, columnCount);
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    columns: {
      control: 'number',
    },
    debug: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Board: Story = {
  args: {
    columns: 4,
  },
};

const createTestData = (db: Database.Database, columnCount: number) => {
  Array.from({ length: columnCount }).forEach((_, i) => {
    db.add(
      Obj.make(TestColumn, {
        items: Array.from({ length: faker.number.int({ min: 0, max: 20 }) }).map((_, j) => {
          const item = db.add(
            Obj.make(TestItem, {
              name: faker.lorem.sentence(3),
              description: faker.lorem.paragraph(1),
              label: `${String.fromCharCode(65 + i)}-${j}`,
            }),
          );

          return Ref.make(item);
        }),
      }),
    );
  });
};
