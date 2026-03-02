//
// Copyright 2024 DXOS.org

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { Treegrid, type TreegridRootProps } from '@dxos/react-ui';

import { type TreeModel, TreeProvider } from './TreeContext';
import { TreeItemById, type TreeItemByIdProps, type TreeItemProps } from './TreeItem';

export type TreeProps<T extends { id: string } = any> = {
  model: TreeModel<T>;
  rootId?: string;
  path?: string[];
  id: string;
} & Partial<Pick<TreegridRootProps, 'gridTemplateColumns' | 'classNames'>> &
  Pick<
    TreeItemProps<T>,
    | 'draggable'
    | 'renderColumns'
    | 'blockInstruction'
    | 'canDrop'
    | 'canSelect'
    | 'onOpenChange'
    | 'onSelect'
    | 'onItemHover'
    | 'levelOffset'
  >;

export const Tree = <T extends { id: string } = any>({
  model,
  rootId,
  path,
  id,
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
  onItemHover,
}: TreeProps<T>) => {
  const childIds = useAtomValue(model.childIds(rootId));
  const treePath = useMemo(() => (path ? [...path, id] : [id]), [id, path]);

  const childProps: Omit<TreeItemByIdProps, 'id' | 'last'> = {
    path: treePath,
    levelOffset,
    draggable,
    renderColumns,
    blockInstruction,
    canDrop,
    canSelect,
    onOpenChange,
    onSelect,
    onItemHover,
  };

  return (
    <Treegrid.Root gridTemplateColumns={gridTemplateColumns} classNames={classNames}>
      <TreeProvider value={model}>
        {childIds.map((childId, index) => (
          <TreeItemById key={childId} id={childId} last={index === childIds.length - 1} {...childProps} />
        ))}
      </TreeProvider>
    </Treegrid.Root>
  );
};
