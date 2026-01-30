//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Event as EventType } from '@dxos/types';

import { translations } from '../../translations';

import { Event } from './Event';

// Wrapper to create event at render time (ECHO objects can't be created at module load).
const DefaultStory = () => {
  const event = useMemo(
    () =>
      EventType.make({
        title: 'Event',
        description: 'Description',
        owner: {},
        startDate: new Date('2025-11-19T12:00:00').toISOString(),
        endDate: new Date('2025-11-19T13:00:00').toISOString(),
      }),
    [],
  );
  return <Event.Root event={event} />;
};

const meta = {
  title: 'plugins/plugin-inbox/Event',
  component: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
