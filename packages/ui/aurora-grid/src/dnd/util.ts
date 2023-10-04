//
// Copyright 2023 DXOS.org
//

import { CSS, Transform } from '@dnd-kit/utilities';

import { arrayMove } from '@dxos/util';

import { MosaicDataItem } from './types';

export const swapItems = <TItem extends MosaicDataItem, TValue extends MosaicDataItem>(
  items: TItem[],
  from: TValue,
  to: TValue,
): TItem[] => {
  const fromIndex = items.findIndex((item) => item.id === from.id);
  const toIndex = items.findIndex((item) => item.id === to.id);
  return fromIndex !== -1 && toIndex !== -1 ? arrayMove(items, fromIndex, toIndex) : items;
};

// https://docs.dndkit.com/api-documentation/draggable/usedraggable#transform
export const getTransformCSS = (transform: Transform | null) =>
  transform ? CSS.Transform.toString(Object.assign(transform, { scaleX: 1, scaleY: 1 })) : undefined;
