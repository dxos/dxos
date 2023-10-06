//
// Copyright 2023 DXOS.org
//

export type MosaicDataItem = { id: string };

// TODO(burdon): Any point making this generic?
export type MosaicDraggedItem<TPosition = unknown> = {
  container: string;
  item: MosaicDataItem;
  position?: TPosition; // Index or layout-specific positional information (stored separately from the item).
};

export type MosaicMoveEvent<TPosition = unknown> = {
  container: string;
  active: MosaicDraggedItem<TPosition>;
  over: MosaicDraggedItem<TPosition>;
};
