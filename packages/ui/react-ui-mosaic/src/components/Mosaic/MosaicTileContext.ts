//
// Copyright 2025 DXOS.org
//

import { type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

import { createContext } from '@dxos/react-hooks';
import { type Size } from '@dxos/react-ui-dnd';

// Kept out of `Tile.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so the context and hook exported beside them force a full page reload on every edit.

export const MOSAIC_TILE_NAME = 'Mosaic.Tile';

export type MosaicTileState =
  | { type: 'idle' }
  | { type: 'preview'; container: HTMLElement; rect: DOMRect }
  | { type: 'dragging' }
  | { type: 'target'; closestEdge: Edge | null };

export type MosaicTileContextValue = {
  state: MosaicTileState;
  /** Register the element that initiates dragging; set by a child `Mosaic.DragHandle`. */
  setDragHandle: (element: HTMLElement | null) => void;
  /** Current extent (rem) during/after resize; undefined when the tile is not sized. */
  size?: Size;
  /** Update the tile extent. A `commit` (drop) propagates to the consumer's `onSizeChange`. */
  setSize: (size: Size, commit?: boolean) => void;
  /** Resize bounds (rem) declared by the tile; consumed by `Mosaic.ResizeHandle`. */
  minSize?: number;
  maxSize?: number;
};

export const [MosaicTileContextProvider, useMosaicTileContext] = createContext<MosaicTileContextValue>('MosaicTile');
