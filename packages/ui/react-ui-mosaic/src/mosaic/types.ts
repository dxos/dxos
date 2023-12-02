//
// Copyright 2023 DXOS.org
//

// TODO(wittjosiah): Rename MosiacDataItem to MosaicItemData?
export type MosaicDataItem = { id: string };

export type MosaicDraggedItem<TPosition = unknown> = {
  path: string;
  type: string;
  // TODO(wittjosiah): Rename data? Otherwise item within item.
  item: MosaicDataItem;
  // Index or layout-specific positional information (stored separately from the item).
  position?: TPosition;
};
