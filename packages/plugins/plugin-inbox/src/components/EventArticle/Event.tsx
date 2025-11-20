//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { mx } from '@dxos/react-ui-theme';
import { type Actor, type Event as EventType } from '@dxos/types';

import { DateComponent, UserIconButton } from '../common';

import { useEventToolbarActions } from './useToolbar';

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

type EventToolbarProps = ThemedClassName<{ onCreateNote?: () => void }>;

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
  onContactCreate?: (actor: Actor.Actor) => void;
};

const EventHeader = ({ onContactCreate }: EventHeaderProps) => {
  const { event } = useEventContext(EventHeader.displayName);

  return (
    <div role='none' className='p-1 flex flex-col gap-2 border-be border-subduedSeparator'>
      <div role='none' className='grid grid-cols-[2rem_1fr] gap-1'>
        <div role='none' className='flex pli-2 pbs-1.5 text-subdued'>
          <Icon icon='ph--check--regular' />
        </div>
        <div role='none' className='flex flex-col gap-1 overflow-hidden'>
          <h2 className='text-lg line-clamp-2'>{event.title}</h2>
          <DateComponent start={new Date(event.startDate)} end={new Date(event.endDate)} />
        </div>
      </div>

      <div role='none'>
        {event.attendees.map((attendee) => (
          <div key={attendee.email} role='none' className='grid grid-cols-[2rem_1fr] gap-1 items-center'>
            <UserIconButton value={attendee.contact?.dxn} onContactCreate={() => onContactCreate?.(attendee)} />
            <h3 className='truncate text-primaryText'>{attendee.name || attendee.email}</h3>
          </div>
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
  return (
    <div role='none' className={mx('p-3', classNames)}>
      {event.description}
    </div>
  );
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
