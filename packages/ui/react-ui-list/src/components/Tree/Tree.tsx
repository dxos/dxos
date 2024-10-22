//
// Copyright 2024 DXOS.org
//

import React, { type ReactNode } from 'react';

import { Treegrid } from '@dxos/react-ui';

import { TreeItem } from './TreeItem';
import { getMode } from './helpers';
import { type ItemType } from './types';

export type TreeProps = {
  items: ItemType[];
  open: string[];
  current: string[];
  draggable?: boolean;
  gridTemplateColumns?: string;
  renderColumns?: (item: ItemType) => ReactNode;
  canDrop?: (data: unknown) => boolean;
  onOpenChange?: (id: string, nextOpen: boolean) => void;
  onSelect?: (id: string, nextState: boolean) => void;
};

export const Tree = ({
  items,
  open,
  current,
  draggable = false,
  gridTemplateColumns = '1fr',
  renderColumns,
  canDrop,
  onOpenChange,
  onSelect,
}: TreeProps) => {
  return (
    <Treegrid.Root gridTemplateColumns={gridTemplateColumns}>
      {items.map((item, i) => (
        <TreeItem
          key={item.id}
          item={item}
          mode={getMode(items, i)}
          open={open.includes(item.id)}
          draggable={draggable}
          current={current.includes(item.id)}
          renderColumns={renderColumns}
          canDrop={canDrop}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
        />
      ))}
    </Treegrid.Root>
  );
};
