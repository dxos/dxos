//
// Copyright 2023 DXOS.org
//

import { DeepSignal } from 'deepsignal';

import { ListItemRootProps } from '@dxos/aurora';
import { MosaicState, useSortable, DraggableAttributes, MosaicChangeHandler } from '@dxos/aurora-grid';

export const DND_PLUGIN = 'dxos.org/plugin/dnd';

export type DndStore = DeepSignal<{ mosaic: MosaicState; onMosaicChangeSubscriptions: MosaicChangeHandler[] }>;

export type DndPluginProvides = {
  dnd: DndStore;
};

export type SortableProps = Partial<{
  draggableAttributes: DraggableAttributes;
  draggableListeners: ReturnType<typeof useSortable>['listeners'];
  style: ListItemRootProps['style'];
  rearranging: boolean;
  migrating: 'away' | 'into';
  isOverlay: boolean;
  isPreview: boolean;
}>;
