//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';

import { createEvents } from '../../testing';

import { EventStack, type EventStackProps } from './EventStack';

const EventStackStory = (props: Omit<EventStackProps, 'events'>) => {
  const events = useMemo(() => createEvents(100), []);
  return <EventStack events={events} {...props} />;
};

const meta: Meta<typeof EventStackStory> = {
  title: 'plugins/plugin-inbox/components/EventStack',
  component: EventStackStory,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention()],
};

export const Responsive: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[30rem]' }), withAttention()],
};
