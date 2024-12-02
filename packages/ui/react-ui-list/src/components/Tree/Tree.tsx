//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Treegrid, type TreegridRootProps } from '@dxos/react-ui';

import { type TreeContextType, TreeProvider } from './TreeContext';
import { TreeItem, type TreeItemProps } from './TreeItem';

export type TreeProps<T = any> = { id: string } & TreeContextType &
  Partial<Pick<TreegridRootProps, 'gridTemplateColumns' | 'classNames'>> &
  Pick<TreeItemProps<T>, 'draggable' | 'renderColumns' | 'canDrop' | 'onOpenChange' | 'onSelect'>;

export const Tree = <T = any,>({
  id,
  getItems,
  getProps,
  isOpen,
  isCurrent,
  draggable = false,
  gridTemplateColumns = '[tree-row-start] 1fr min-content [tree-row-end]',
  classNames,
  renderColumns,
  canDrop,
  onOpenChange,
  onSelect,
}: TreeProps<T>) => {
  const context = useMemo(
    () => ({
      getItems,
      getProps,
      isOpen,
      isCurrent,
    }),
    [getItems, getProps, isOpen, isCurrent],
  );
  const items = getItems();
  const path = useMemo(() => [id], [id]);

  return (
    <Treegrid.Root gridTemplateColumns={gridTemplateColumns} classNames={classNames}>
      <TreeProvider value={context}>
        {items.map((item, index) => (
          <TreeItem
            key={item.id}
            item={item}
            last={index === items.length - 1}
            path={path}
            draggable={draggable}
            renderColumns={renderColumns}
            canDrop={canDrop}
            onOpenChange={onOpenChange}
            onSelect={onSelect}
          />
        ))}
      </TreeProvider>
    </Treegrid.Root>
  );
};
