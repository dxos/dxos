//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
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

// Wrapper to create event at render time (ECHO objects can't be created at module load).
const EventCardStory = ({ role }: Pick<SurfaceComponentProps<Event.Event>, 'role'>) => {
  const subject = useMemo(() => createMockEvent(), []);
  return (
    <IntrinsicCardContainer>
      <Card.Root>
        <EventCard role={role} subject={subject} />
      </Card.Root>
    </IntrinsicCardContainer>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/EventCard',
  component: EventCardStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof EventCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    role: 'card--intrinsic',
  },
};
