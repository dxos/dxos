//
// Copyright 2024 DXOS.org
//

import { type ItemMode } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';

import { type ItemType } from './types';

export const DEFAULT_INDENTATION = 8;

export const paddingIndendation = (level: number, indentation = DEFAULT_INDENTATION) => ({
  paddingInlineStart: `${level > 1 ? (level - 2) * indentation : 0}px`,
});

export const getMode = (items: ItemType[], index: number): ItemMode => {
  const item = items[index];
  const next = items[index + 1];
  if (!next || item.path.length > next.path.length) {
    return 'last-in-group';
  } else if (item.path.length < next.path.length) {
    return 'expanded';
  } else {
    return 'standard';
  }
};
