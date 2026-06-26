//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ItemContent } from './ItemContent';

const meta = {
  title: 'ui/react-ui-list/ItemContent',
  component: ItemContent,
  render: (args) => (
    <div className='flex flex-col w-[24rem] divide-y divide-subdued-separator'>
      <ItemContent {...args} classNames='p-2' />
      <ItemContent icon='ph--clock--regular' title='Title only, no description' classNames='p-2' />
      <ItemContent
        icon='ph--x-circle--regular'
        iconClassNames='text-error'
        title='Failed run'
        description='Failed · 2.6s'
        classNames='p-2'
      />
    </div>
  ),
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof ItemContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: 'ph--check-circle--regular',
    iconClassNames: 'text-success',
    title: '6/26/2026, 5:00:00 AM',
    description: 'Success · 2.5s',
  },
};
