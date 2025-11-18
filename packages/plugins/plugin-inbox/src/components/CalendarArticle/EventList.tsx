//
// Copyright 2023 DXOS.org
//

import { type Locale, format, intervalToDuration } from 'date-fns';
import React from 'react';

import { IconButton, List, ListItem, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Actor, type Event } from '@dxos/types';

import { meta } from '../../meta';

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
// NOTE: Common layout (spacing) for icon/text for DateComponent and ActorComponent.

export const DateComponent = ({ start, end, locale }: { start: Date; end?: Date; locale?: Locale }) => {
  const { t } = useTranslation(meta.id);
  let { hours = 0, minutes = 0 } = (end && intervalToDuration({ start, end })) ?? {};
  // Prefer 90m over 1h 30m.
  if (hours === 1 && minutes !== 0) {
    hours = 0;
    minutes += 60;
  }
  const duration = [hours > 0 && `${hours}h`, minutes > 0 && `${minutes}m`].filter(Boolean).join(' ');

  return (
    <div className='flex items-center gap-2 overflow-hidden whitespace-nowrap'>
      <IconButton
        variant='ghost'
        icon='ph--calendar--duotone'
        iconOnly
        size={4}
        label={t('open calendar button')}
        classNames='cursor-pointer text-subdued !p-0'
      />
      <div className='truncate text-description'>{format(start, 'PPp', { locale })}</div>
      {(hours || minutes) && <div className='text-description text-xs'>({duration})</div>}
    </div>
  );
};

export const ActorComponent = ({ actor, classNames }: ThemedClassName<{ actor: Actor.Actor }>) => {
  const { t } = useTranslation(meta.id);

  return (
    <div role='none' className={mx('flex is-full items-center gap-2 overflow-hidden', classNames)}>
      <IconButton
        variant='ghost'
        disabled={!actor.contact}
        icon='ph--user--duotone'
        iconOnly
        size={4}
        label={t('open profile button')}
        classNames='cursor-pointer text-subdued !p-0'
      />
      <div className='truncate text-description'>{actor.name ?? actor.email}</div>
    </div>
  );
};

export const ActorListComponent = ({ classNames, actors }: ThemedClassName<{ actors: Actor.Actor[] }>) => {
  return (
    <div role='none' className={mx('flex flex-col is-full', classNames)}>
      {actors.map((actor, idx) => (
        <ActorComponent key={idx} actor={actor} />
      ))}
    </div>
  );
};
