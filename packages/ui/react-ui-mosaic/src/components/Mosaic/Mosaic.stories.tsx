//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { Board, DebugRoot, TestColumn, TestItem } from '../../testing';
import { Focus } from '../Focus';

import { Mosaic } from './Mosaic';

faker.seed(999);

type StoryProps = {
  columns?: number;
  debug?: boolean;
};

const DefaultStory = ({ columns: columnsProp = 1, debug = false }: StoryProps) => {
  const [space] = useSpaces();
  const db = space.db;

  const [columns, setColumns] = useState<TestColumn[]>(
    Array.from({ length: columnsProp }).map((_, i) => {
      const col = Obj.make(TestColumn, {
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
      });

      return col;
    }),
  );

  return (
    <Mosaic.Root asChild debug={debug}>
      <div className={mx('grid overflow-hidden', debug && 'grid-cols-[1fr_20rem] gap-2')}>
        <Board id='board' columns={columns} debug={debug} />
        {debug && (
          <Focus.Group classNames='flex flex-col gap-2 overflow-hidden'>
            <Toolbar.Root classNames='border-b border-separator'>
              <IconButton
                icon='ph--arrows-clockwise--regular'
                iconOnly
                label='refresh'
                onClick={() => setColumns([...columns])}
              />
            </Toolbar.Root>
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

export const Default: Story = {
  args: {
    columns: 3,
  },
};
