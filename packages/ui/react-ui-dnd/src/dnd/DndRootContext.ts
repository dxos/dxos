//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type DndDraggingState } from './Root.tsx';
import { type DndContainerHandler } from './types.ts';

// Kept out of `Root.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type DndRootContextValue = {
  containers: Record<string, DndContainerHandler>;
  addContainer: (container: DndContainerHandler) => void;
  removeContainer: (id: string) => void;
  dragging?: DndDraggingState;
};

export const [DndRootContextProvider, useDndRootContext] = createContext<DndRootContextValue>('DndRoot');
