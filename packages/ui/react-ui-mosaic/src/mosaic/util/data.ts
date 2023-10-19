//
// Copyright 2023 DXOS.org
//

import { arrayMove } from '@dxos/util';

import { type MosaicDataItem } from '../types';

// TODO(wittjosiah): Generalize and expand rearrange utilities.

export const swapItems = <TItem extends MosaicDataItem, TValue extends MosaicDataItem>(
  items: TItem[],
  from: TValue,
  to: TValue,
): TItem[] => {
  const fromIndex = items.findIndex((item) => item.id === from.id);
  const toIndex = items.findIndex((item) => item.id === to.id);
  return fromIndex !== -1 && toIndex !== -1 ? arrayMove(items, fromIndex, toIndex) : items;
};
