//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Event as EventType } from '@dxos/types';

import { translations } from '../../translations';
import { Event } from './Event';

const DefaultStory = () => {
  const event = useMemo(
    () =>
      EventType.make({
        title: faker.lorem.sentence(5),
        description: faker.lorem.paragraph(2),
        owner: {},
        startDate: new Date('2025-11-19T12:00:00').toISOString(),
        endDate: new Date('2025-11-19T13:00:00').toISOString(),
      }),
    [],
  );

  return (
    <Event.Root event={event}>
      <Event.Header />
      <Event.Viewport>
        <Event.Content />
      </Event.Viewport>
    </Event.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/Event',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
