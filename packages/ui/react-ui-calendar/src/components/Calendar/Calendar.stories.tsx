//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { Calendar } from './Calendar';

const meta = {
  title: 'ui/react-ui-calendar/Calendar',
  component: Calendar.Grid,
  parameters: {
    translations,
  },
} satisfies Meta<typeof Calendar.Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  render: () => (
    <Calendar.Root>
      <Calendar.Toolbar />
      <Calendar.Grid rows={6} />
    </Calendar.Root>
  ),
};

export const Column: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-auto' })],
  render: () => (
    <Calendar.Root>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Calendar.Toolbar />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Calendar.Grid />
        </Panel.Content>
      </Panel.Root>
    </Calendar.Root>
  ),
};
