//
// Copyright 2025 DXOS.org
//

import { type ElementDragPayload } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

export type GetId<TData = any> = (data: TData) => string;

/**
 * NOTE: Must implement value equivalence.
 */
export type LocationType = string | number;

/**
 * Get the source data from the drag payload.
 */
export const getSourceData = <TData = any, TLocation = any>(
  source: ElementDragPayload,
): MosaicTileData<TData, TLocation> | null => {
  return source.data.type === 'tile' ? (source.data as MosaicTileData<TData, TLocation>) : null;
};

/**
 * Draggable item.
 * Tiles may contain arbitrary data (which may not be an ECHO object; e.g., search result).
 */
export type MosaicTileData<TData = any, TLocation = any> = {
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
export type MosaicPlaceholderData<TLocation = any> = {
  type: 'placeholder';
  containerId: string;
  location: TLocation;
};

/**
 * Drop target container.
 */
export type MosaicContainerData = {
  type: 'container';
  id: string;
};

export type MosaicData = MosaicTileData | MosaicPlaceholderData | MosaicContainerData;

export type MosaicTargetData = MosaicTileData | MosaicPlaceholderData;

/**
 * Handler implemented by drop containers.
 */
export interface MosaicEventHandler<TData = any, TObject = any> {
  /**
   * Container identifier.
   */
  id: string;

  /**
   * Determine if the item can be dropped into this container.
   * NOTE: This is continuously called while dragging (doesn't require mouse movement).
   */
  canDrop?: (props: { source: MosaicTileData<TData> }) => boolean;

  /**
   * Called during drag for custom visualization.
   */
  onDrag?: (props: { source: MosaicTileData<TData>; position: { x: number; y: number } }) => void;

  /**
   * Insert/rearrange the item at the given location.
   */
  onDrop?: (props: { source: MosaicTileData<TData>; target?: MosaicData }) => void;

  /**
   * Request the object to be dropped.
   * This allows the source container to clone/mutate/swap the object before it is dropped.
   * If the callback returns true, then the callback may decide to remove the item from the source container,
   * completing the transfer.
   */
  onTake?: (props: { source: MosaicTileData<TData> }, cb: (object: TObject) => Promise<boolean>) => void;

  /**
   * Dragging ended.
   */
  onCancel?: () => void;
}
