//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { type Space } from '@dxos/react-client/echo';
import { Icon, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { mx } from '@dxos/react-ui-theme';
import { type Actor, type Event as EventType } from '@dxos/types';

import { meta } from '../../meta';
import { DateComponent } from '../common';

import { EventAttendee } from './EventAttendee';
import { type UseEventToolbarActionsProps, useEventToolbarActions } from './useToolbar';

//
// Context
//

type EventContextValue = {
  attendableId?: string;
  event: EventType.Event;
};

const [EventContextProvider, useEventContext] = createContext<EventContextValue>('Event');

//
// Root
//

type EventRootProps = PropsWithChildren<EventContextValue>;

const EventRoot = ({ children, ...props }: EventRootProps) => {
  return <EventContextProvider {...props}>{children}</EventContextProvider>;
};

EventRoot.displayName = 'Event.Root';

//
// Toolbar
//

type EventToolbarProps = ThemedClassName<UseEventToolbarActionsProps>;

const EventToolbar = ({ classNames, ...props }: EventToolbarProps) => {
  const { attendableId } = useEventContext(EventToolbar.displayName);
  const actions = useEventToolbarActions(props);

  return (
    <MenuProvider {...actions} attendableId={attendableId}>
      <ToolbarMenu classNames={classNames} />
    </MenuProvider>
  );
};

EventToolbar.displayName = 'Event.Toolbar';

//
// Viewport
//

type EventViewportProps = ThemedClassName<PropsWithChildren<{}>>;

const EventViewport = ({ classNames, children }: EventViewportProps) => {
  return <div className={mx(classNames)}>{children}</div>;
};

EventViewport.displayName = 'Event.Viewport';

//
// Header
//

type EventHeaderProps = {
  space?: Space;
  onContactCreate?: (actor: Actor.Actor) => void;
};

const EventHeader = ({ space, onContactCreate }: EventHeaderProps) => {
  const { t } = useTranslation(meta.id);
  const { event } = useEventContext(EventHeader.displayName);

  return (
    <div role='none' className='p-1 flex flex-col gap-2 border-be border-subduedSeparator'>
      <div role='none' className='grid grid-cols-[2rem_1fr] gap-1'>
        <div role='none' className='flex pli-2 text-subdued bs-[28px] items-center'>
          <Icon icon='ph--check--regular' />
        </div>
        <div role='none' className='flex flex-col gap-1 overflow-hidden'>
          <h2 className='text-lg line-clamp-2'>{event.title ?? t('event untitled label')}</h2>
        </div>
      </div>

      <div role='none' className='grid grid-cols-[2rem_1fr] gap-1'>
        <div role='none' className='flex pli-2 text-subdued items-center'>
          <Icon icon='ph--calendar--regular' />
        </div>
        <div role='none' className='flex flex-col gap-1 overflow-hidden'>
          <DateComponent start={new Date(event.startDate)} end={new Date(event.endDate)} />
        </div>
      </div>

      <div role='none'>
        {event.attendees.map((attendee) => (
          <EventAttendee key={attendee.email} attendee={attendee} space={space} onContactCreate={onContactCreate} />
        ))}
      </div>
    </div>
  );
};

EventHeader.displayName = 'Event.Header';

//
// Content
//

type EventContentProps = ThemedClassName<{}>;

const EventContent = ({ classNames }: EventContentProps) => {
  const { event } = useEventContext(EventContent.displayName);

  return event.description ? (
    <div role='none' className={mx('p-3', classNames)}>
      {event.description}
    </div>
  ) : null;
};

EventContent.displayName = 'Event.Content';

//
// Event
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const Event = {
  Root: EventRoot,
  Toolbar: EventToolbar,
  Viewport: EventViewport,
  Header: EventHeader,
  Content: EventContent,
};

export type { EventRootProps, EventToolbarProps, EventViewportProps, EventHeaderProps, EventContentProps };
