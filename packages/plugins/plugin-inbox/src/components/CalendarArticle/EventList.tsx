//
// Copyright 2023 DXOS.org
//

import { type Locale, format, intervalToDuration } from 'date-fns';
import React from 'react';

import { Icon, List, ListItem, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Actor, type Event } from '@dxos/types';

// TODO(burdon): Event/Message Articles (in companion); with cards (1-UP).
// TODO(burdon): Common virtualized list for Event/Message.
// TODO(burdon): Common Actor reference (lookup on demand).
// TODO(burdon): Virtualize (and reuse for email).

// TODO(burdon): Modes: e.g., itinerary (with day markers).
// TODO(burdon): Show upcoming events vs. past.

export type EventListProps = ThemedClassName<{
  events?: Event.Event[];
  selected?: string;
  onSelect?: (contact: Event.Event) => void;
}>;

export const EventList = ({ classNames, events = [] }: EventListProps) => {
  return (
    <List classNames={mx('@container is-full divide-y divide-separator overflow-y-auto', classNames)}>
      {events.map((event) => (
        <ListItem.Root key={event.id} classNames='p-2 hover:bg-hoverOverlay'>
          <EventComponent event={event} />
        </ListItem.Root>
      ))}
    </List>
  );
};

const EventComponent = ({ event }: { event: Event.Event }) => {
  return (
    <div
      className="
        flex flex-col is-full gap-2 overflow-hidden
        @xl:grid md:grid-cols-[1fr_20rem] @xl:grid-rows-[auto_1fr]
        @xl:[grid-template-areas:'left-top_right''left-main_right']
        @xl:gap-x-4
      "
    >
      <div className='[grid-area:left-top] overflow-hidden'>{event.name}</div>
      <div className='[grid-area:left-main] overflow-hidden'>
        <DateComponent start={new Date(event.startDate)} end={new Date(event.endDate)} />
      </div>
      <ActorListComponent classNames='[grid-area:right] overflow-hidden' actors={event.attendees} />
    </div>
  );
};

// TODO(burdon): Factor out.
//  Create library of common compponents for all types.

const DateComponent = ({ start, end, locale }: { start: Date; end?: Date; locale?: Locale }) => {
  let { hours = 0, minutes = 0 } = (end && intervalToDuration({ start, end })) ?? {};
  if (hours === 1 && minutes !== 0) {
    hours = 0;
    minutes += 60;
  }
  const duration = [hours > 0 && `${hours}h`, minutes > 0 && `${minutes}m`].filter(Boolean).join(' ');

  return (
    <div className='flex items-center gap-1 overflow-hidden whitespace-nowrap'>
      <Icon icon='ph--calendar--duotone' size={5} classNames='text-primary-500' />
      <div className='truncate text-description'>{format(start, 'PPp', { locale })}</div>
      {(hours || minutes) && <div className='text-description text-xs'>({duration})</div>}
    </div>
  );
};

const ActorListComponent = ({ classNames, actors }: ThemedClassName<{ actors: Actor.Actor[] }>) => {
  return (
    <div role='none' className={mx('flex flex-col is-full', classNames)}>
      {actors.map((actor, idx) => (
        <ActorComponent key={idx} actor={actor} />
      ))}
    </div>
  );
};

const ActorComponent = ({ actor, classNames }: ThemedClassName<{ actor: Actor.Actor }>) => {
  return (
    <div role='none' className={mx('flex is-full items-center gap-2 overflow-hidden', classNames)}>
      <Icon icon='ph--user--regular' classNames='cursor-pointer text-subdued' />
      <div className='truncate text-description'>{actor.name ?? actor.email}</div>
    </div>
  );
};
