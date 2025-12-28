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

export type ContainerData = {
  type: 'container';
  id: string;
};

export type DropEvent = {
  source: ItemData;
  target?: ItemData;
  container: ContainerData;
};

export interface DropEventHandler {
  id: string;
  canDrop: (props: { item: ItemData }) => boolean;
  onUpdate?: (props: { insert?: ItemData; at?: ItemData; remove?: ItemData }) => void;
}
