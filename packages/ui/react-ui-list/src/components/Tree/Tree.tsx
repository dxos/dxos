//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Treegrid } from '@dxos/react-ui';

import { TreeItem } from './TreeItem';
import { type ItemType } from './types';

export type TreeProps = {
  items: ItemType[];
  open: string[];
  current: string[];
  draggable?: boolean;
  canDrop?: (data: unknown) => boolean;
  onOpenChange?: (id: string, nextOpen: boolean) => void;
  onSelect?: (id: string, nextState: boolean) => void;
};

export const Tree = ({ items, open, current, draggable = false, canDrop, onOpenChange, onSelect }: TreeProps) => {
  return (
    <Treegrid.Root gridTemplateColumns='1fr'>
      {items.map((item) => (
        <TreeItem
          key={item.id}
          item={item}
          open={open.includes(item.id)}
          draggable={draggable}
          current={current.includes(item.id)}
          canDrop={canDrop}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
        />
      ))}
    </Treegrid.Root>
  );
};
