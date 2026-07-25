//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useEffect, useSyncExternalStore } from 'react';

import { type DndCoordinator, type DndDraggingState, getDefaultDndCoordinator, resolveDrop } from './coordinator';
import { type DndContainerHandler } from './types';

//
// Context
//

type DndRootContextValue = {
  containers: Record<string, DndContainerHandler>;
  addContainer: (container: DndContainerHandler) => void;
  removeContainer: (id: string) => void;
  dragging?: DndDraggingState;
};

const [DndRootContextProvider, useDndRootContext] = createContext<DndRootContextValue>('DndRoot');

//
// Root
//

const DND_ROOT_NAME = 'Dnd.Root';

type DndRootProps = PropsWithChildren<{
  /**
   * Coordination domain to bind to. Defaults to the shared app-wide coordinator, so
   * independently-mounted roots (including detached surface roots) coordinate drags with
   * each other; pass a dedicated instance to isolate a domain (e.g. a storybook decorator).
   */
  coordinator?: DndCoordinator;
}>;

/**
 * Headless: binds the drag-and-drop coordination domain into React context, renders no DOM of
 * its own. All coordination state lives in the {@link DndCoordinator} — this component is a
 * stateless carrier, so mounting one per React root is cheap and they all share one domain.
 */
const DndRoot = ({ coordinator = getDefaultDndCoordinator(), children }: DndRootProps) => {
  const snapshot = useSyncExternalStore(coordinator.subscribe, coordinator.getSnapshot, coordinator.getSnapshot);

  // The document-scoped monitor is ref-counted across roots sharing the coordinator.
  useEffect(() => coordinator.acquire(), [coordinator]);

  return (
    <DndRootContextProvider
      containers={snapshot.containers}
      addContainer={coordinator.addContainer}
      removeContainer={coordinator.removeContainer}
      dragging={snapshot.dragging}
    >
      {children}
    </DndRootContextProvider>
  );
};

DndRoot.displayName = DND_ROOT_NAME;

export const Dnd = { Root: DndRoot };

export { resolveDrop, useDndRootContext };

export type { DndDraggingState, DndRootContextValue, DndRootProps };
