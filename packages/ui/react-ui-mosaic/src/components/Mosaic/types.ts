//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

/**
 * Draggable item.
 */
export type MosaicTileData<T extends Obj.Any = Obj.Any, Location = any> = {
  type: 'tile';
  id: string;
  containerId: string;
  location: Location;
  bounds?: DOMRect;
  // TODO(burdon): Generalize (has ID).
  object: T;
};

/**
 * Drop target placeholder.
 */
export type MosaicPlaceholderData<Location = any> = {
  type: 'placeholder';
  containerId: string;
  location: Location;
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
export interface MosaicEventHandler {
  /**
   * Container identifier.
   */
  id: string;

  /**
   * Determine if the item can be dropped into this container.
   * NOTE: This is continuously called while dragging (doesn't require mouse movement).
   */
  canDrop?: (props: { source: MosaicTileData }) => boolean;

  /**
   * Called during drag for custom visualization.
   */
  onDrag?: (props: { source: MosaicTileData; position: { x: number; y: number } }) => void;

  /**
   * Insert/rearrange the item at the given location.
   */
  onDrop?: (props: { source: MosaicTileData; target?: MosaicData }) => void;

  /**
   * Request the object to be dropped.
   * This allows the source container to clone/mutate/swap the object before it is dropped.
   * If the callback returns true, then the callback may decide to remove the item from the source container,
   * completing the transfer.
   */
  onTake?: (props: { source: MosaicTileData }, cb: (object: Obj.Any) => Promise<boolean>) => void;

  /**
   * Dragging ended.
   */
  onCancel?: () => void;
}
