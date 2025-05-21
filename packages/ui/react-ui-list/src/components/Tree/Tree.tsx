//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { type HasId } from '@dxos/echo-schema';
import { Treegrid, type TreegridRootProps } from '@dxos/react-ui';

import { type TreeContextType, TreeProvider } from './TreeContext';
import { TreeItem, type TreeItemProps } from './TreeItem';

export type TreeProps<T extends HasId = any> = {
  root?: T;
  path?: string[];
  id: string;
} & TreeContextType<T> &
  Partial<Pick<TreegridRootProps, 'gridTemplateColumns' | 'classNames'>> &
  Pick<TreeItemProps<T>, 'draggable' | 'renderColumns' | 'canDrop' | 'onOpenChange' | 'onSelect' | 'levelOffset'>;

export const Tree = <T extends HasId = any>({
  root,
  path,
  id,
  useItems,
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
  levelOffset,
}: TreeProps<T>) => {
  const context = useMemo(
    () => ({
      useItems,
      getProps,
      isOpen,
      isCurrent,
    }),
    [useItems, getProps, isOpen, isCurrent],
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
            canDrop={canDrop}
            onOpenChange={onOpenChange}
            onSelect={onSelect}
          />
        ))}
      </TreeProvider>
    </Treegrid.Root>
  );
};
