//
// Copyright 2023 DXOS.org
//

import { format } from 'date-fns';
import React from 'react';

import { Icon, List, ListItem, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Actor, type Event } from '@dxos/types';

export type EventListProps = {
  events?: Event.Event[];
  selected?: string;
  onSelect?: (contact: Event.Event) => void;
};

// TODO(burdon): Event/Message Articles (in companion); with cards (1-UP).
// TODO(burdon): Common virtualized list for Event/Message.
// TODO(burdon): Common Actor reference (lookup on demand).

// TODO(burdon): Virtualize (and reuse for email).
export const EventList = ({ events = [], selected, onSelect }: EventListProps) => {
  return (
    <List classNames='is-full divide-y divide-separator overflow-y-auto'>
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
    <li
      className="
        flex flex-col is-full gap-2
        md:grid md:grid-cols-[1fr_20rem] md:grid-rows-[auto_1fr]
        md:[grid-template-areas:'left-top_right''left-main_right']
        md:gap-2
      "
    >
      <div className='[grid-area:left-top]'>{event.name}</div>
      <div className='[grid-area:left-main]'>
        <DateComponent date={event.startDate} />
      </div>
      <ActorListComponent classNames='[grid-area:right]' actors={event.attendees} />
    </li>
  );
};

// TODO(burdon): Factor out.
//  Create library of common compponents for all types.

const DateComponent = ({ date }: { date: string }) => {
  const formatted = format(new Date(date), 'PPpp');

  return (
    <div className='flex items-center gap-2'>
      <Icon icon='ph--calendar--regular' />
      <div className='text-description'>{formatted}</div>
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
      <Icon icon='ph--user--regular' classNames='cursor-pointer' />
      <div className='text-description truncate'>{actor.name ?? actor.email}</div>
    </div>
  );
};
