//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Builder } from '#testing';

import { EventStack, type EventStackProps } from './EventStack';

const EventStackStory = (props: Omit<EventStackProps, 'id' | 'events'>) => {
  const { events } = useMemo(() => new Builder().createEvents(100).build(), []);
  return <EventStack id='story' events={events} {...props} />;
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
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
};

export const Responsive: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[30rem]' }), withAttention(), withMosaic()],
};
