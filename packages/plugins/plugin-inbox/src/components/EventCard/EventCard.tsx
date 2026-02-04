//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Card } from '@dxos/react-ui-mosaic';
import { type Event } from '@dxos/types';

import { ActorList, DateComponent } from '../common';

export const EventCard = ({ subject: event }: SurfaceComponentProps<Event.Event>) => {
  return (
    <Card.Content>
      <Card.Row>
        <DateComponent icon start={new Date(event.startDate)} end={new Date(event.endDate)} />
      </Card.Row>
      <Card.Row>
        <ActorList classNames='[grid-area:right] overflow-hidden' actors={event.attendees} />
      </Card.Row>
    </Card.Content>
  );
};
