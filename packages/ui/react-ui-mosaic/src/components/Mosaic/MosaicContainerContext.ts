//
// Copyright 2025 DXOS.org
//

import { createContext } from '@dxos/react-hooks';
import { type DndContainerHandler, type DndDraggingState, type DndLocation } from '@dxos/react-ui-dnd';
import type * as Focus from '@dxos/react-ui/Focus';
import { type AllowedAxis } from '@dxos/ui-types';

// Kept out of `Container.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so the context and hook exported beside them force a full page reload on every edit.

export const MOSAIC_CONTAINER_NAME = 'Mosaic.Container';

export type MosaicContainerState = { type: 'idle' } | { type: 'active'; bounds?: DOMRect };

export type MosaicContainerContextValue<TData = any, Location = DndLocation> = {
  id: string;
  eventHandler: DndContainerHandler<TData>;
  orientation?: AllowedAxis;
  dragging?: DndDraggingState;
  scrolling?: boolean;
  state: MosaicContainerState;

  /** Active drop location. */
  activeLocation?: Location;
  setActiveLocation: (location: Location | undefined) => void;

  /** ID of the current (aria-current) item. */
  currentId?: string;
  /** Set the current item by ID. */
  setCurrentId: (id: string | undefined) => void;

  /** Each item's selection and activation (see `Mosaic.Container`'s `itemProps`). */
  itemProps?: (id: string) => Focus.ItemBinding | undefined;

  /** Register a scroll-to-item callback (provided by Stack/VirtualStack). */
  registerScrollTo: (fn: ((id: string) => void) | undefined) => void;
};

export const [MosaicContainerContextProvider, useMosaicContainerContext] =
  createContext<MosaicContainerContextValue>('MosaicContainer');
