//
// Copyright 2023 DXOS.org
//

import { DraggableAttributes } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';

import { ListItemRootProps } from '@dxos/aurora';

export type SortableProps = Partial<{
  draggableAttributes: DraggableAttributes;
  draggableListeners: ReturnType<typeof useSortable>['listeners'];
  style: ListItemRootProps['style'];
  rearranging: boolean;
  isOverlay: boolean;
}>;
