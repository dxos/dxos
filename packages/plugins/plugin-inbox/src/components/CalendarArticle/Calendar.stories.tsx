//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';

import { createEvents } from '../../testing';

import { EventList } from './EventList';

const DefaultStory = () => {
  const [events] = useState(() => createEvents(100));
  return <EventList events={events} />;
};

const meta = {
  title: 'plugins/plugin-inbox/Calendar',
  component: EventList as any,
  render: DefaultStory,
  decorators: [withTheme, withAttention],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof EventList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
