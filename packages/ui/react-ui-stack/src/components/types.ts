//
// Copyright 2025 DXOS.org
//

import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

import { type Size as DndSize } from '@dxos/react-ui-dnd';

export type Orientation = 'horizontal' | 'vertical';

/**
 * Size is how Stack and its StackItems coordinate the dimensions of the items with the available space.
 * - `intrinsic` signals to Stack and its StackItems to occupy their intrinsic size
 * - Any other size will extrinsically fill the available space along the axis of its orientation and handle overflow:
 *   - `contain` causes StackItems to occupy their intrinsic size
 *   - `split` divides the Stack’s available space among the StackItems
 */
export type Size = 'intrinsic' | 'contain' | 'split';

export type StackItemSize = DndSize;

export type StackItemData = {
  id: string;
  type: 'column' | 'card';
};

export type StackItemRearrangeHandler<Data extends { id: string } = StackItemData> = (
  source: Data,
  target: Data,
  closestEdge: Edge | null,
) => void;

export type StackContextValue = {
  stackId?: string;
  orientation: Orientation;
  rail: boolean;
  size: Size;
  onRearrange?: StackItemRearrangeHandler;
};
