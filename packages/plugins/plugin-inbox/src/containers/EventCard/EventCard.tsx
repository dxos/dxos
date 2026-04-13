//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui';
import { type Event } from '@dxos/types';

import { DateComponent } from '#components';

export type EventCardProps = AppSurface.ObjectCardProps<Event.Event>;

export const EventCard = ({ subject: event }: EventCardProps) => {
  return (
    <Card.Content>
      <Card.Row icon='ph--calendar--regular'>
        <DateComponent start={new Date(event.startDate)} end={new Date(event.endDate)} />
      </Card.Row>
      {event.description && (
        <Card.Row>
          <Card.Text variant='description'>{event.description}</Card.Text>
        </Card.Row>
      )}
      {event.attendees.map((attendee, i) => (
        <Card.Row key={i} icon='ph--user--regular'>
          <Card.Text>{attendee.name}</Card.Text>
        </Card.Row>
      ))}
    </Card.Content>
  );
};
