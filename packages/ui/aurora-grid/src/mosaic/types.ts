//
// Copyright 2023 DXOS.org
//

export type MosaicDataItem = { id: string };

export type MosaicDraggedItem<TPosition = unknown> = {
  container: string; // TODO(burdon): Rename path?
  item: MosaicDataItem;
  // Index or layout-specific positional information (stored separately from the item).
  position?: TPosition;
};

export type MosaicMoveEvent<TPosition = unknown> = {
  container: string;
  active: MosaicDraggedItem<TPosition>;
  over: MosaicDraggedItem<TPosition>;
};
