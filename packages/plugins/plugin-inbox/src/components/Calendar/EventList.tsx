//
// Copyright 2023 DXOS.org
//

import { format } from 'date-fns';
import React from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
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
    <ul className={mx('is-full divide-y divide-separator overflow-y-auto')}>
      {events.map((event) => (
        <EventComponent key={event.id} event={event} />
      ))}
    </ul>
  );
};

const EventComponent = ({ event }: { event: Event.Event }) => {
  return (
    <li
      className="
        flex flex-col gap-2 p-1
        md:grid md:grid-cols-[1fr_20rem] md:grid-rows-[auto_1fr]
        md:[grid-template-areas:'left-top_right''left-main_right']
        md:gap-2
        hover:bg-hoverOverlay
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
