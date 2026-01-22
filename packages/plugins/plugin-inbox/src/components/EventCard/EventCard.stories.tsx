//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';
import { Card } from '@dxos/react-ui-mosaic';
import { IntrinsicCardContainer } from '@dxos/react-ui-mosaic/testing';
import { Event } from '@dxos/types';

import { EventCard } from './EventCard';

faker.seed(1234);

const createMockEvent = (): Event.Event =>
  Event.make({
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 2_000).toISOString(),
    attendees: [
      {
        name: faker.person.fullName(),
        email: faker.internet.email(),
      },
    ],
    owner: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
    },
  });

const meta = {
  title: 'plugins/plugin-inbox/EventCard',
  component: EventCard,
  render: (args) => {
    return (
      <IntrinsicCardContainer>
        <Card.Root>
          <EventCard {...args} />
        </Card.Root>
      </IntrinsicCardContainer>
    );
  },
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof EventCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    role: 'card--intrinsic',
    subject: createMockEvent(),
  },
};
