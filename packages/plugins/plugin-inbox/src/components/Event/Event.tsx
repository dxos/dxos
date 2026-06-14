//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useState } from 'react';

import { type Database, type Obj } from '@dxos/echo';
import { Card, ScrollArea, type ThemedClassName } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Menu, MenuRootProps } from '@dxos/react-ui-menu';
import { type Actor, type Event as EventType } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { MarkdownViewer } from '../MarkdownViewer';
import { type ViewMode } from '../ViewMode';
import { EventBodyEditor } from './EventBodyEditor';
import { EventDetails } from './EventDetails';
import { type UseEventToolbarActionsProps, useEventToolbarActions } from './useToolbar';

//
// Context
//

type EventContextValue = {
  attendableId?: string;
  event: EventType.Event;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

const [EventContextProvider, useEventContext] = createContext<EventContextValue>('Event');

//
// Root
//

const EVENT_ROOT_NAME = 'Event.Root';

type EventRootProps = PropsWithChildren<
  Omit<EventContextValue, 'viewMode' | 'setViewMode'> & {
    viewMode?: ViewMode;
  }
>;

const EventRoot = ({ children, viewMode: viewModeProp = 'markdown', ...props }: EventRootProps) => {
  const [viewMode, setViewMode] = useState(viewModeProp);

  return (
    <EventContextProvider viewMode={viewMode} setViewMode={setViewMode} {...props}>
      {children}
    </EventContextProvider>
  );
};

EventRoot.displayName = EVENT_ROOT_NAME;

//
// Toolbar
//

const EVENT_TOOLBAR_NAME = 'Event.Toolbar';

type EventToolbarProps = Pick<
  UseEventToolbarActionsProps,
  'onOpen' | 'onSave' | 'saveDisabled' | 'onDelete' | 'editing'
> &
  Pick<MenuRootProps, 'alwaysActive'>;

const EventToolbar = composable<HTMLDivElement, EventToolbarProps>(
  ({ alwaysActive, onOpen, onSave, saveDisabled, onDelete, editing, ...props }, forwardedRef) => {
    const { attendableId, viewMode, setViewMode } = useEventContext(EVENT_TOOLBAR_NAME);
    const menuActions = useEventToolbarActions({
      viewMode,
      setViewMode,
      onOpen,
      onSave,
      saveDisabled,
      onDelete,
      editing,
    });

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
  /** When true, the title and date range become editable (used for draft events). */
  editable?: boolean;
  onContactCreate?: (actor: Actor.Actor) => void;
  onOpenObject?: (object: Obj.Unknown) => void;
};

const EventHeader = ({ db, editable, onContactCreate, onOpenObject }: EventHeaderProps) => {
  const { event } = useEventContext(EVENT_HEADER_NAME);

  return (
    <Card.Root
      border={false}
      fullWidth
      // Card.Body is `display: contents`, so rows are direct grid items — add row-gap when editing.
      classNames={mx('p-1 border-b border-subdued-separator', editable && 'gap-y-1')}
    >
      <Card.Body>
        <EventDetails
          event={event}
          title='heading'
          editable={editable}
          db={db}
          onContactCreate={onContactCreate}
          onOpenObject={onOpenObject}
        />
      </Card.Body>
    </Card.Root>
  );
};

EventHeader.displayName = EVENT_HEADER_NAME;

//
// Body
//

const EVENT_BODY_NAME = 'Event.Body';

type EventBodyProps = ThemedClassName<{
  /** Render the description as an editor bound to the event (used for draft events). */
  editable?: boolean;
}>;

const EventBody = ({ classNames, editable }: EventBodyProps) => {
  const { event, viewMode } = useEventContext(EVENT_BODY_NAME);

  if (editable) {
    return <EventBodyEditor event={event} markdown={viewMode !== 'plain'} classNames={classNames} />;
  }

  return event.description ? (
    <MarkdownViewer content={event.description} markdown={viewMode !== 'plain'} classNames={mx('p-3', classNames)} />
  ) : null;
};

EventBody.displayName = EVENT_BODY_NAME;

//
// Event
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const Event = {
  Root: EventRoot,
  Toolbar: EventToolbar,
  Viewport: EventViewport,
  Header: EventHeader,
  Body: EventBody,
};

export type { EventRootProps, EventToolbarProps, EventViewportProps, EventHeaderProps, EventBodyProps };
