//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { useObject } from '@dxos/echo-react';
import * as Card from '@dxos/react-ui/Card';
import { type Event } from '@dxos/types';

import { EventDetails } from '#components';

export type EventCardProps = AppSurface.ObjectCardProps<Event.Event>;

export const EventCard = ({ subject: event }: EventCardProps) => {
  // Subscribed for the re-render alone: `EventDetails` reads the live event.
  useObject(event);
  return (
    <Card.Body>
      <EventDetails event={event} title={false} description />
    </Card.Body>
  );
};

EventCard.displayName = 'EventCard';
