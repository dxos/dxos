//
// Copyright 2026 DXOS.org
//

import { type ElementDragPayload } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

export type GetId<TData = any> = (data: TData) => string;

/**
 * NOTE: Must implement value equivalence.
 */
export type DndLocation = string | number;

/**
 * Get the source data from the drag payload.
 */
export const getSourceData = <TData = any, TLocation = any>(
  source: ElementDragPayload,
): DndTileData<TData, TLocation> | null => {
  return source.data.type === 'tile' ? (source.data as DndTileData<TData, TLocation>) : null;
};

/**
 * Draggable item.
 * Tiles may contain arbitrary data (which may not be an ECHO object; e.g., search result).
 */
export type DndTileData<TData = any, TLocation = any> = {
  type: 'tile';
  containerId: string;
  id: string;
  data: TData;
  location: TLocation;
  bounds?: DOMRect;
};

/**
 * Drop target placeholder.
 */
export type DndPlaceholderData<TLocation = any> = {
  type: 'placeholder';
  containerId: string;
  location: TLocation;
};

/**
 * Drop target container.
 */
export type DndContainerData = {
  type: 'container';
  id: string;
};

export type DndData = DndTileData | DndPlaceholderData | DndContainerData;

export type DndTargetData = DndTileData | DndPlaceholderData;

/**
 * Handler implemented by drop containers.
 */
export interface DndContainerHandler<TData = any, TObject = any> {
  /**
   * Container identifier. Must be unique per live container instance across the whole `Dnd.Root`
   * (use `useContainerId` to append a discriminator when the same object may mount in multiple containers).
   */
  id: string;

  /**
   * Open, container-defined descriptor of what this container holds. Not interpreted by the core;
   * surfaced to the other container's `canDrop`/`onDrop` so cross-container drop rules can decide
   * whether a source is acceptable without parsing the opaque `id`.
   */
  payload?: unknown;

  /**
   * Determine if the item can be dropped into this container.
   * NOTE: This is continuously called while dragging (doesn't require mouse movement).
   */
  canDrop?: (props: { source: DndTileData<TData> }) => boolean;

  /**
   * Called during drag for custom visualization.
   */
  onDrag?: (props: { source: DndTileData<TData>; position: { x: number; y: number } }) => void;

  /**
   * Insert/rearrange the item at the given location.
   */
  onDrop?: (props: { source: DndTileData<TData>; target?: DndData }) => void;

  /**
   * Request the object to be dropped.
   * This allows the source container to clone/mutate/swap the object before it is dropped.
   * If the callback returns true, then the callback may decide to remove the item from the source container,
   * completing the transfer.
   */
  onTake?: (props: { source: DndTileData<TData> }, cb: (object: TObject) => Promise<boolean>) => void;

  /**
   * Dragging ended.
   */
  onCancel?: () => void;
}
