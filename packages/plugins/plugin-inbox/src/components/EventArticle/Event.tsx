//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { mx } from '@dxos/react-ui-theme';
import { type Event as EventType } from '@dxos/types';

import { formatDateTime } from '../../util';
import { UserIconButton } from '../UserIconButton';

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

type EventToolbarProps = ThemedClassName<{}>;

const EventToolbar = ({ classNames }: EventToolbarProps) => {
  const { attendableId } = useEventContext(EventToolbar.displayName);
  const menu = {};

  return (
    <MenuProvider {...menu} attendableId={attendableId}>
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
  onContactCreate?: () => void;
};

const EventHeader = ({ onContactCreate }: EventHeaderProps) => {
  const { event } = useEventContext(EventHeader.displayName);

  return (
    <div className='p-1 flex flex-col gap-2 border-be border-subduedSeparator'>
      <div className='grid grid-cols-[2rem_1fr] gap-1'>
        <div className='flex pli-2 pbs-1.5 text-subdued'>
          <Icon icon='ph--check--regular' />
        </div>
        <div className='flex flex-col gap-1 overflow-hidden'>
          <h2 className='text-lg line-clamp-2'>{event.title}</h2>
          <div className='whitespace-nowrap text-sm text-description'>
            {formatDateTime(new Date(), new Date(event.startDate))}
          </div>
        </div>
      </div>

      {/* TODO(burdon): List From/CC. */}
      <div>
        {event.attendees.map((attendee) => (
          <div key={attendee.email} className='grid grid-cols-[2rem_1fr] gap-1 items-center'>
            <UserIconButton value={attendee.contact?.dxn} onContactCreate={onContactCreate} />
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
  return <div className={mx(classNames)}>{event.description}</div>;
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
