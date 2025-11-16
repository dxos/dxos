//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';

import { createEvents } from '../../testing';

import { EventList } from './EventList';

const meta: Meta<typeof EventList> = {
  title: 'plugins/plugin-inbox/EventList',
  component: EventList,
  args: {
    events: createEvents(100),
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme, withLayout({ container: 'column' }), withAttention],
};

export const Responsive: Story = {
  decorators: [withTheme, withLayout({ container: 'column', classNames: 'is-[30rem]' }), withAttention],
};
