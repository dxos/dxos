//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { faker } from '@dxos/random';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Focus } from '../Focus';

import { Mosaic } from './Mosaic';
import { Column, DebugRoot, TestColumn, TestItem } from './testing';

faker.seed(999);

type StoryProps = {
  columns?: number;
  debug?: boolean;
};

const DefaultStory = ({ columns: columnsProp = 1, debug = false }: StoryProps) => {
  const [columns, setColumns] = useState<TestColumn[]>(
    Array.from({ length: columnsProp }).map((_, i) =>
      Obj.make(TestColumn, {
        items: Array.from({ length: faker.number.int({ min: 8, max: 20 }) }).map((_, j) =>
          Ref.make(
            Obj.make(TestItem, {
              name: faker.lorem.sentence(3),
              description: faker.lorem.paragraph(1),
              label: `${String.fromCharCode(65 + i)}-${j}`,
            }),
          ),
        ),
      }),
    ),
  );

  return (
    <Mosaic.Root>
      <Focus.Group axis='horizontal' classNames='p-2 bs-full is-full grid grid-cols-[1fr_25rem] gap-2 overflow-hidden'>
        <div className='flex bs-full overflow-x-auto'>
          {/* <Mosaic.Container autoscroll withFocus> */}
          <div className='flex gap-2 bs-full'>
            {columns.map((column) => (
              <Column key={column.id} column={column} debug={debug} />
            ))}
          </div>
          {/* </Mosaic.Container> */}
        </div>

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
      </Focus.Group>
    </Mosaic.Root>
  );
};

const meta = {
  title: 'ui/react-ui-mosaic/Mosaic',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    debug: true,
    columns: 2,
  },
};
