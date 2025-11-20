//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { List, ListItem, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Event } from '@dxos/types';

import { ActorList, DateComponent } from '../common';

// TODO(burdon): Event/Message Articles (in companion); with cards (1-UP).
// TODO(burdon): Common Actor reference (lookup on demand).

// TODO(burdon): Common virtualized list for Event/Message.
// TODO(burdon): Virtualize (and reuse for email).
// TODO(burdon): Modes: e.g., itinerary (with day markers).
// TODO(burdon): Show upcoming events vs. past.

export type EventListProps = ThemedClassName<{
  events?: Event.Event[];
  selected?: string;
  onSelect?: (contact: Event.Event) => void;
}>;

export const EventList = ({ classNames, events = [], onSelect }: EventListProps) => {
  return (
    <List classNames={mx('@container is-full divide-y divide-separator overflow-y-auto', classNames)}>
      {events.map((event) => (
        <ListItem.Root key={event.id} classNames='p-2 hover:bg-hoverOverlay' onClick={() => onSelect?.(event)}>
          <EventComponent event={event} />
        </ListItem.Root>
      ))}
    </List>
  );
};

// TODO(wittjosiah): Reconcile with EventCard.
const EventComponent = ({ event }: { event: Event.Event }) => {
  return (
    <div
      className="
        flex flex-col is-full gap-2 overflow-hidden
        @xl:grid @xl:grid-cols-[1fr_20rem] @xl:grid-rows-[auto_1fr]
        @xl:[grid-template-areas:'left-top_right''left-main_right']
        @xl:gap-x-4
      "
    >
      <div className='[grid-area:left-top] overflow-hidden'>{event.title}</div>
      <div role='none' className='[grid-area:left-main] overflow-hidden'>
        <DateComponent icon start={new Date(event.startDate)} end={new Date(event.endDate)} />
      </div>
      <ActorList classNames='[grid-area:right] overflow-hidden' actors={event.attendees} />
    </div>
  );
};
