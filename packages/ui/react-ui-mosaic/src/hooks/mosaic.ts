//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

// TODO(burdon): Reconcile with react-ui-dnd.

export type ItemData = {
  type: 'item';
  id: string;
  object: Obj.Any;
  containerId: string;
};

export type PlaceholderData<LOC = any> = {
  type: 'placeholder';
  location: LOC;
  containerId: string;
};

export type ContainerData = {
  type: 'container';
  id: string;
};

export type DropTargetData = ItemData | PlaceholderData;

export type DropEvent = {
  source: ItemData;
  target?: DropTargetData;
  container: ContainerData;
};

/**
 * Handler implemented by drop containers.
 */
export interface DropEventHandler {
  id: string;

  /**
   * Determine if the item can be dropped into this container.
   */
  canDrop: (props: { item: ItemData }) => boolean;

  /**
   * Insert/rearrange the item at the given location.
   */
  onDrop?: (props: { item: ItemData; at?: DropTargetData }) => void;

  /**
   * Request the object to be dropped.
   * This allows the source container to clone/mutate/swap the object before it is dropped.
   * If the callback returns true, then the callback may decide to remove the item from the source container,
   * completing the transfer.
   */
  onTake?: (item: ItemData, cb: (item: ItemData) => boolean) => void;
}
