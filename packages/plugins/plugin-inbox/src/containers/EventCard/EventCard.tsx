//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui';
import { type Event } from '@dxos/types';

import { EventDetails } from '#components';

export type EventCardProps = AppSurface.ObjectCardProps<Event.Event>;

export const EventCard = ({ subject: event }: EventCardProps) => {
  return (
    <Card.Body>
      <EventDetails event={event} title={false} description />
    </Card.Body>
  );
};
