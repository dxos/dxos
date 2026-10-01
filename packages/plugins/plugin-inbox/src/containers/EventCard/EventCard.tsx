//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Next } from '@dxos/react-ui/next';
import { type Event } from '@dxos/types';

import { EventDetails } from '#components';

export type EventCardProps = AppSurface.ObjectCardProps<Event.Event>;

export const EventCard = ({ subject: event }: EventCardProps) => {
  return (
    <Next.Card.Body>
      <EventDetails event={event} title={false} description />
    </Next.Card.Body>
  );
};

EventCard.displayName = 'EventCard';
