//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { List, ListItem, ScrollArea, type ThemedClassName } from '@dxos/react-ui';
import { type Event } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { ActorList } from '../Actor';
import { DateComponent } from '../DateComponent';

// TODO(burdon): Event/Message Articles (in companion); with cards (1-UP).
// TODO(burdon): Common Actor reference (lookup on demand).
// TODO(burdon): Modes: e.g., itinerary (with day markers).
// TODO(burdon): Show upcoming events vs. past.

const EventComponent = ({ event }: { event: Event.Event }) => {
  return (
    <div
      className="
        flex flex-col w-full gap-2 overflow-hidden
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

export type EventStackProps = ThemedClassName<{
  events?: Event.Event[];
  selected?: string;
  onSelect?: (contact: Event.Event) => void;
}>;

export const EventStack = ({ classNames, events = [], onSelect }: EventStackProps) => {
  return (
    <ScrollArea.Root thin>
      <ScrollArea.Viewport>
        <List classNames={mx('@container w-full divide-y divide-separator', classNames)}>
          {events.map((event) => (
            <ListItem.Root key={event.id} classNames='p-2 hover:bg-hover-overlay' onClick={() => onSelect?.(event)}>
              <EventComponent event={event} />
            </ListItem.Root>
          ))}
        </List>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
