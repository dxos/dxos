//
// Copyright 2023 DXOS.org
//

export type CompareMosaicDataItem = Parameters<typeof Array.prototype.sort>[0];

export type MosaicDataItem = { id: string };

export type MosaicDraggedItem<TPosition = unknown> = {
  path: string;
  item: MosaicDataItem;
  // Index or layout-specific positional information (stored separately from the item).
  position?: TPosition;
};

export type MosaicMoveEvent<TPosition = unknown> = {
  active: MosaicDraggedItem<TPosition>;
  over: MosaicDraggedItem<TPosition>;
};
