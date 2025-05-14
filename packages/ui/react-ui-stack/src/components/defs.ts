//
// Copyright 2025 DXOS.org
//

import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

import { type Size as DndSize } from '@dxos/react-ui-dnd';

import { type Orientation, type Size } from './Stack';

export type StackItemSize = DndSize;

export type StackItemData = { id: string; type: 'column' | 'card' };

export type StackItemRearrangeHandler<Data extends { id: string } = StackItemData> = (
  source: Data,
  target: Data,
  closestEdge: Edge | null,
) => void;

export type StackContextValue = {
  orientation: Orientation;
  rail: boolean;
  size: Size;
  onRearrange?: StackItemRearrangeHandler;
};
