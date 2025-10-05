//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React from 'react';

import { DropdownMenu, Icon } from '@dxos/react-ui';

import { StackItem, type StackItemRootProps } from './StackItem';

const DefaultStory = (props: StackItemRootProps) => {
  return (
    <StackItem.Root role='section' {...props} classNames='w-[20rem] border border-separator'>
      <StackItem.Heading>
        <span className='sr-only'>Title</span>
        <div role='none' className='sticky -block-start-px bg-[--sticky-bg] p-1 is-full'>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <StackItem.SigilButton>
                <Icon icon='ph--dots-three--regular' size={5} />
              </StackItem.SigilButton>
            </DropdownMenu.Trigger>
          </DropdownMenu.Root>
        </div>
      </StackItem.Heading>
      <StackItem.Content classNames='p-2'>Content</StackItem.Content>
    </StackItem.Root>
  );
};

const meta = {
  title: 'ui/react-ui-stack/StackItem',
  component: StackItem.Root as any,
  render: DefaultStory,
  decorators: [withTheme],

  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    item: { id: '1' },
  },
};
