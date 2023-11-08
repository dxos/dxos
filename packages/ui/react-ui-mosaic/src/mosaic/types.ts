//
// Copyright 2023 DXOS.org
//

export type MosaicDataItem = { id: string };

export type MosaicDraggedItem<TPosition = unknown> = {
  path: string;
  // TODO(wittjosiah): Rename data? Otherwise item within item.
  item: MosaicDataItem;
  // Index or layout-specific positional information (stored separately from the item).
  position?: TPosition;
};
