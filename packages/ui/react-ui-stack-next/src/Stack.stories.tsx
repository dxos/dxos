//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Stack } from './Stack';
import { StackItem } from './StackItem';

const KanbanBlock = ({ column, row }: { column: number; row: number }) => {
  return (
    <div className='is-64 bs-24 bg-input rounded-lg border border-separator shadow-sm grid place-content-center'>
      <span className='text-sm font-medium'>
        {column},{row}
      </span>
    </div>
  );
};

const StorybookStack = () => {
  return (
    <Stack orientation={'horizontal'} classNames='gap-1'>
      {[...Array(3)].map((_, columnIndex) => (
        <StackItem
          key={columnIndex}
          orientation={'horizontal'}
          container={'container'}
          classNames='p-4 bg-deck rounded-md'
        >
          <Stack orientation={'vertical'} classNames='gap-1'>
            {[...Array(4)].map((_, rowIndex) => (
              <StackItem key={rowIndex} orientation={'vertical'} container={`col-item-${columnIndex}`}>
                <KanbanBlock column={columnIndex} row={rowIndex} />
              </StackItem>
            ))}
          </Stack>
        </StackItem>
      ))}
    </Stack>
  );
};

const meta: Meta<typeof StorybookStack> = {
  title: 'react-ui-stack-next/Stack',
  component: StorybookStack,
  decorators: [withTheme],
  argTypes: { orientation: { control: 'radio', options: ['horizontal', 'vertical'] } },
};

export default meta;

type Story = StoryObj<typeof StorybookStack>;

export const Default: Story = {
  args: { orientation: 'horizontal' },
};
