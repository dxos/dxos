//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { Icon } from '@dxos/react-ui';

import { type MultiselectItem } from './extension';

export type PillProps = {
  item: MultiselectItem;
  onSelect: (item: MultiselectItem) => void;
  onDelete?: (item: MultiselectItem) => void;
};

export const Pill: FC<PillProps> = ({ item, onSelect, onDelete }) => {
  return (
    <span className='border border-separator rounded-md px-1 py-0.5 cursor-pointer hover:bg-hoverSurface'>
      {/* TODO(burdon): Truncate max width. */}
      <span onClick={() => onSelect(item)}>{item.label}</span>
      {onDelete && (
        <Icon
          icon='ph--x--regular'
          classNames='inline-block mis-0.5 p-0 opacity-50 hover:opacity-100 cursor-pointer'
          onClick={() => onDelete(item)}
        />
      )}
    </span>
  );
};
