//
// Copyright 2023 DXOS.org
//

import { DeepSignal } from 'deepsignal';

import { Node } from '@braneframe/plugin-graph';
import { ListItemRootProps } from '@dxos/aurora';
import { useSortable, DraggableAttributes, MosaicChangeHandler, MosaicState, Tile } from '@dxos/aurora-grid';

export const DND_PLUGIN = 'dxos.org/plugin/dnd';

export type SetTileHandler = (tile: Tile, node: Node) => Tile;

export type CopyTileHandler = (tile: Tile, id: string, toId: string, mosaic: MosaicState) => Tile;

export type DndStore = DeepSignal<{
  mosaic: MosaicState;
  onMosaicChangeSubscriptions: MosaicChangeHandler[];
  onSetTileSubscriptions: SetTileHandler[];
  onCopyTileSubscriptions: CopyTileHandler[];
}>;

export type DndPluginProvides = {
  dnd: DndStore;
  onSetTile: SetTileHandler;
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
