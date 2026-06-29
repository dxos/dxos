//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useState } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { type ThemedClassName, ScrollArea } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Menu, MenuRootProps } from '@dxos/react-ui-menu';
import { type Actor, type Event as EventType } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { Header } from '../Header';
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
  /** Graph node id for toolbar action lookup — differs from `attendableId` in companion mode. */
  nodeId?: string;
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
  'graph' | 'onOpen' | 'onSave' | 'saveDisabled' | 'onDelete' | 'editing'
> &
  Pick<MenuRootProps, 'alwaysActive'>;

const EventToolbar = composable<HTMLDivElement, EventToolbarProps>(
  ({ alwaysActive, graph, onOpen, onSave, saveDisabled, onDelete, editing, ...props }, forwardedRef) => {
    const { attendableId, nodeId, viewMode, setViewMode } = useEventContext(EVENT_TOOLBAR_NAME);
    const menuActions = useEventToolbarActions({
      graph,
      nodeId,
      editing,
      saveDisabled,
      viewMode,
      setViewMode,
      onOpen,
      onSave,
      onDelete,
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
  starred?: boolean;
  onToggleStar?: () => void;
};

const EventHeader = ({ db, editable, onContactCreate, onOpenObject, starred, onToggleStar }: EventHeaderProps) => {
  const { event } = useEventContext(EVENT_HEADER_NAME);

  return (
    // Card.Body is `display: contents`, so rows are direct grid items — add row-gap when editing.
    <Header.Root classNames={editable && 'gap-y-1'}>
      <EventDetails
        event={event}
        title='heading'
        db={db}
        editable={editable}
        starred={starred}
        onContactCreate={onContactCreate}
        onOpenObject={onOpenObject}
        onToggleStar={onToggleStar}
      />
    </Header.Root>
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

  if (!event.description) {
    return null;
  }

  return (
    <MarkdownViewer content={event.description} markdown={viewMode !== 'plain'} classNames={mx('p-3', classNames)} />
  );
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

export type { EventBodyProps, EventHeaderProps, EventRootProps, EventToolbarProps, EventViewportProps };
