//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { random } from '@dxos/random';
import { IntrinsicCardContainer } from '@dxos/react-ui-mosaic/testing';
import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';
import { Event } from '@dxos/types';

import { EventCard } from './EventCard.tsx';

random.seed(1234);

const createMockEvent = (): Event.Event =>
  Event.make({
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 2_000).toISOString(),
    title: random.lorem.sentence(3),
    description: random.lorem.sentences(2),
    attendees: [
      {
        name: random.person.fullName(),
        email: random.internet.email(),
      },
      {
        name: random.person.fullName(),
        email: random.internet.email(),
      },
    ],
    owner: {
      name: random.person.fullName(),
      email: random.internet.email(),
    },
  });

const EventCardStory = () => {
  const subject = useMemo(() => createMockEvent(), []);
  return (
    <IntrinsicCardContainer>
      <Next.Card.Root>
        <Next.Card.Header>
          <Next.DragHandle />
          <Next.Card.Title>{Obj.getLabel(subject)}</Next.Card.Title>
        </Next.Card.Header>
        <EventCard role='card--content' subject={subject} />
      </Next.Card.Root>
    </IntrinsicCardContainer>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/containers/EventCard',
  component: EventCardStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof EventCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
