//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Treegrid, type TreegridRootProps } from '@dxos/react-ui';
import { Path } from '@dxos/react-ui-mosaic';

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
      {items.map((item, i) => {
        const path = Path.create(...item.path);

        return (
          <TreeItem
            key={item.id}
            item={item}
            mode={getMode(items, i)}
            open={open.includes(path)}
            // TODO(wittjosiah): This should also be path-based.
            current={current.includes(item.id)}
            draggable={draggable}
            renderColumns={renderColumns}
            canDrop={canDrop}
            onOpenChange={onOpenChange}
            onSelect={onSelect}
          />
        );
      })}
    </Treegrid.Root>
  );
};
