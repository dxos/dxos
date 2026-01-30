//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';

import { createEvents } from '../../testing';

import { EventList, type EventListProps } from './EventList';

// Wrapper to create events at render time (ECHO objects can't be created at module load).
const EventListStory = (props: Omit<EventListProps, 'events'>) => {
  const events = useMemo(() => createEvents(100), []);
  return <EventList events={events} {...props} />;
};

const meta: Meta<typeof EventListStory> = {
  title: 'plugins/plugin-inbox/EventList',
  component: EventListStory,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme, withLayout({ layout: 'column' }), withAttention],
};

export const Responsive: Story = {
  decorators: [withTheme, withLayout({ layout: 'column', classNames: 'is-[30rem]' }), withAttention],
};
