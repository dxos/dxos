//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

/**
 * Draggable item.
 */
export type MosaicCellData = {
  type: 'cell';
  id: string;
  containerId: string;
  object: Obj.Any; // TODO(burdon): Generalize (has ID).
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

export type MosaicDropTargetData<Location = any> =
  | MosaicCellData
  | MosaicPlaceholderData<Location>
  | MosaicContainerData;

/**
 *
 */
export type MosaicEvent<Location = any> = {
  source: MosaicCellData;
  target?: MosaicDropTargetData<Location>;
  container: MosaicContainerData;
};

/**
 * Handler implemented by drop containers.
 */
export interface MosaicEventHandler<Location = any> {
  /**
   * Container identifier.
   */
  id: string;

  /**
   * Determine if the item can be dropped into this container.
   */
  canDrop?: (props: { source: MosaicCellData }) => boolean;

  /**
   * Called during drag for custom visualization.
   */
  onDrag?: (props: { source: MosaicCellData; position: { x: number; y: number } }) => void;

  /**
   * Insert/rearrange the item at the given location.
   */
  onDrop?: (props: { source: MosaicCellData; target?: MosaicDropTargetData<Location> }) => void;

  /**
   * Request the object to be dropped.
   * This allows the source container to clone/mutate/swap the object before it is dropped.
   * If the callback returns true, then the callback may decide to remove the item from the source container,
   * completing the transfer.
   */
  onTake?: (props: { source: MosaicCellData }, cb: (object: Obj.Any) => Promise<boolean>) => void;

  /**
   * Dragging ended.
   */
  onCancel?: () => void;
}
