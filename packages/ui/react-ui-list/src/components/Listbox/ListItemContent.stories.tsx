//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Icon } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ListItemContent } from './ListItemContent';

const meta = {
  title: 'ui/react-ui-list/ItemContent',
  component: ListItemContent,
  render: (args) => (
    <div className='flex flex-col divide-y divide-subdued-separator'>
      <ListItemContent {...args} classNames='p-2' />
      <ListItemContent icon='ph--clock--regular' title='Title only, no description' classNames='p-2' />
      <ListItemContent
        icon={<Icon icon='ph--x-circle--regular' size={5} classNames='text-error-text' />}
        title='Failed run'
        description='Failed · 2.6s'
        classNames='p-2'
      />
    </div>
  ),
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof ListItemContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: <Icon icon='ph--check-circle--regular' size={5} classNames='text-success-text' />,
    title: '6/26/2026, 5:00:00 AM',
    description: 'Success · 2.5s',
  },
};
