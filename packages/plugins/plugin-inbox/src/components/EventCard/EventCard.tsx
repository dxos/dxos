//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Card } from '@dxos/react-ui-stack';
import { type Event } from '@dxos/types';

import { ActorList, DateComponent } from '../common';

export const EventCard = ({ subject: event, role }: SurfaceComponentProps<Event.Event>) => {
  return (
    <Card.SurfaceRoot
      role={role}
      classNames="
        flex flex-col is-full gap-2 overflow-hidden p-2
        @xl:grid @xl:grid-cols-[1fr_20rem] @xl:grid-rows-[auto_1fr]
        @xl:[grid-template-areas:'left-top_right''left-main_right']
        @xl:gap-x-4
      "
    >
      <div className='[grid-area:left-top] overflow-hidden'>{event.title}</div>
      <div role='none' className='[grid-area:left-main] overflow-hidden'>
        <DateComponent start={new Date(event.startDate)} end={new Date(event.endDate)} />
      </div>
      <ActorList classNames='[grid-area:right] overflow-hidden' actors={event.attendees} />
    </Card.SurfaceRoot>
  );
};
