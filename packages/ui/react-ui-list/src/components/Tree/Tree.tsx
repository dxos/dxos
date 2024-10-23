//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Treegrid, type TreegridRootProps } from '@dxos/react-ui';

import { TreeItem, type TreeItemProps } from './TreeItem';
import { getMode } from './helpers';
import { type ItemType } from './types';

export type TreeProps = {
  items: ItemType[];
  open: string[];
  current: string[];
} & Partial<Pick<TreegridRootProps, 'gridTemplateColumns'>> &
  Pick<TreeItemProps, 'draggable' | 'renderColumns' | 'canDrop' | 'onOpenChange' | 'onSelect'>;

export const Tree = ({
  items,
  open,
  current,
  draggable = false,
  gridTemplateColumns = '[tree-row-start] 1fr min-content [tree-row-end]',
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
