//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

//
// Context
//

type EventContextValue = {};

const [EventContextProvider, useEventContext] = createContext<EventContextValue>('Event');

//
// Root
//

type EventRootProps = PropsWithChildren;

const EventRoot = ({ children }: EventRootProps) => {
  return <EventContextProvider>{children}</EventContextProvider>;
};

EventRoot.displayName = 'Event.Root';

//
// Content
//

type EventContentProps = ThemedClassName<{}>;

const EventContent = ({ classNames }: EventContentProps) => {
  const context = useEventContext(EventContent.displayName);
  return <div className={mx(classNames)}>{JSON.stringify(context)}</div>;
};

EventContent.displayName = 'Event.Content';

//
// Event
// https://www.radix-ui.com/primitives/docs/guides/composition
//

export const Event = {
  Root: EventRoot,
  Content: EventContent,
};

export type { EventRootProps, EventContentProps };
