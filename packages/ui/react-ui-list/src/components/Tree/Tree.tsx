//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useRef } from 'react';

import { Treegrid, type TreegridRootProps } from '@dxos/react-ui';

import { type TreeContextType, TreeProvider } from './TreeContext';
import { TreeItem, type TreeItemProps } from './TreeItem';

export type TreeProps<T extends { id: string } = any, O = any> = {
  root?: T;
  path?: string[];
  id: string;
} & Omit<TreeContextType<T, O>, 'useChildIds' | 'useItem'> &
  Partial<Pick<TreeContextType<T, O>, 'useChildIds' | 'useItem'>> &
  Partial<Pick<TreegridRootProps, 'gridTemplateColumns' | 'classNames'>> &
  Pick<
    TreeItemProps<T>,
    | 'draggable'
    | 'renderColumns'
    | 'blockInstruction'
    | 'canDrop'
    | 'canSelect'
    | 'onOpenChange'
    | 'onSelect'
    | 'levelOffset'
  >;

export const Tree = <T extends { id: string } = any, O = any>({
  root,
  path,
  id,
  useItems,
  getProps,
  useIsOpen,
  useIsCurrent,
  useChildIds: useChildIdsProp,
  useItem: useItemProp,
  draggable = false,
  gridTemplateColumns = '[tree-row-start] 1fr min-content [tree-row-end]',
  classNames,
  levelOffset,
  renderColumns,
  blockInstruction,
  canDrop,
  canSelect,
  onOpenChange,
  onSelect,
}: TreeProps<T, O>) => {
  // Shared item cache for default useChildIds/useItem fallback.
  const itemCacheRef = useRef(new Map<string, T>());

  // Default useChildIds: wraps useItems and populates item cache.
  const useDefaultChildIds = (parent?: T) => {
    const items = useItems(parent);
    for (const item of items) {
      itemCacheRef.current.set(item.id, item);
    }
    return items.map((item) => item.id);
  };

  // Default useItem: reads from item cache populated by useDefaultChildIds.
  const useDefaultItem = (itemId: string) => {
    return itemCacheRef.current.get(itemId);
  };

  const useChildIds = useChildIdsProp ?? useDefaultChildIds;
  const useItem = useItemProp ?? useDefaultItem;

  const context = useMemo(
    () => ({
      useItems,
      getProps,
      useIsOpen,
      useIsCurrent,
      useChildIds,
      useItem,
    }),
    [useItems, getProps, useIsOpen, useIsCurrent, useChildIdsProp, useItemProp],
  );
  const items = useItems(root);
  const treePath = useMemo(() => (path ? [...path, id] : [id]), [id, path]);

  return (
    <Treegrid.Root gridTemplateColumns={gridTemplateColumns} classNames={classNames}>
      <TreeProvider value={context}>
        {items.map((item, index) => (
          <TreeItem
            key={item.id}
            item={item}
            last={index === items.length - 1}
            path={treePath}
            levelOffset={levelOffset}
            draggable={draggable}
            renderColumns={renderColumns}
            blockInstruction={blockInstruction}
            canDrop={canDrop}
            canSelect={canSelect}
            onOpenChange={onOpenChange}
            onSelect={onSelect}
          />
        ))}
      </TreeProvider>
    </Treegrid.Root>
  );
};
