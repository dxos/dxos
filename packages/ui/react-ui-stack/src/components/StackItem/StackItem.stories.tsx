//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Icon, DropdownMenu } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { StackItem } from './StackItem';

const meta: Meta<typeof StackItem.Root> = {
  title: 'ui/react-ui-stack/StackItem',
  component: StackItem.Root,
  render: (args) => (
    <StackItem.Root role='section' {...args} classNames='w-[20rem] border border-separator'>
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
  ),
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof StackItem.Root>;

export const Default: Story = {
  args: {
    item: { id: '1' },
  },
};
