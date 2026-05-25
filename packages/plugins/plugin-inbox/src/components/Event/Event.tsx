//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { type Database } from '@dxos/echo';
import { Icon, ScrollArea, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Menu, MenuRootProps } from '@dxos/react-ui-menu';
import { type Actor, type Event as EventType } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { DateComponent } from '../DateComponent';
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

const EVENT_ROOT_NAME = 'Event.Root';

type EventRootProps = PropsWithChildren<EventContextValue>;

const EventRoot = ({ children, ...props }: EventRootProps) => {
  return <EventContextProvider {...props}>{children}</EventContextProvider>;
};

EventRoot.displayName = EVENT_ROOT_NAME;

//
// Toolbar
//

const EVENT_TOOLBAR_NAME = 'Event.Toolbar';

type EventToolbarProps = Pick<UseEventToolbarActionsProps, 'onNoteCreate'> & Pick<MenuRootProps, 'alwaysActive'>;

const EventToolbar = composable<HTMLDivElement, EventToolbarProps>(
  ({ alwaysActive, onNoteCreate, ...props }, forwardedRef) => {
    const { attendableId } = useEventContext(EVENT_TOOLBAR_NAME);
    const menuActions = useEventToolbarActions({ onNoteCreate });

    return (
      <Menu.Root {...menuActions} attendableId={attendableId} alwaysActive={alwaysActive}>
        <Menu.Toolbar {...composableProps(props)} ref={forwardedRef} />
      </Menu.Root>
    );
  },
);

EventToolbar.displayName = EVENT_TOOLBAR_NAME;

//
// Viewport
//

const EVENT_VIEWPORT_NAME = 'Event.Viewport';

type EventViewportProps = {};

const EventViewport = composable<HTMLDivElement, EventViewportProps>(({ children, ...props }, forwardedRef) => {
  return (
    <ScrollArea.Root {...composableProps(props)} thin ref={forwardedRef}>
      <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

EventViewport.displayName = EVENT_VIEWPORT_NAME;

//
// Header
//

const EVENT_HEADER_NAME = 'Event.Header';

type EventHeaderProps = {
  db?: Database.Database;
  onContactCreate?: (actor: Actor.Actor) => void;
};

const EventHeader = ({ db, onContactCreate }: EventHeaderProps) => {
  const { t } = useTranslation(meta.id);
  const { event } = useEventContext(EVENT_HEADER_NAME);

  return (
    <div className='p-1 flex flex-col gap-2 border-b border-subdued-separator'>
      <div className='grid grid-cols-[2rem_1fr] gap-1'>
        <div className='flex px-2 text-subdued h-[28px] items-center'>
          <Icon icon='ph--check--regular' />
        </div>
        <div className='flex flex-col gap-1 overflow-hidden'>
          <h2 className='text-lg line-clamp-2'>{event.title ?? t('event-untitled.label')}</h2>
        </div>
      </div>

      <div className='grid grid-cols-[2rem_1fr] gap-1'>
        <div className='flex px-2 text-subdued items-center'>
          <Icon icon='ph--calendar--regular' />
        </div>
        <div className='flex flex-col gap-1 overflow-hidden'>
          <DateComponent start={new Date(event.startDate)} end={new Date(event.endDate)} />
        </div>
      </div>

      <div>
        {event.attendees.map((attendee) => (
          <EventAttendee key={attendee.email} attendee={attendee} db={db} onContactCreate={onContactCreate} />
        ))}
      </div>
    </div>
  );
};

EventHeader.displayName = EVENT_HEADER_NAME;

//
// Content
//

const EVENT_CONTENT_NAME = 'Event.Content';

type EventContentProps = ThemedClassName<{}>;

const EventContent = ({ classNames }: EventContentProps) => {
  const { event } = useEventContext(EVENT_CONTENT_NAME);

  return event.description ? <div className={mx('p-3', classNames)}>{event.description}</div> : null;
};

EventContent.displayName = EVENT_CONTENT_NAME;

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
