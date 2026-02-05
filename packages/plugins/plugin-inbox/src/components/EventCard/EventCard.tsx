//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Card } from '@dxos/react-ui-mosaic';
import { type Event } from '@dxos/types';

import { DateComponent } from '../common';

export const EventCard = ({ subject: event }: SurfaceComponentProps<Event.Event>) => {
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
