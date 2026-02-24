//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Treegrid, type TreegridRootProps } from '@dxos/react-ui';

import { type TreeContextType, TreeProvider } from './TreeContext';
import { TreeItemById, type TreeItemByIdProps, type TreeItemProps } from './TreeItem';

export type TreeProps<T extends { id: string } = any> = {
  root?: T;
  path?: string[];
  id: string;
} & TreeContextType<T> &
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

export const Tree = <T extends { id: string } = any>({
  root,
  path,
  id,
  getProps,
  useIsOpen,
  useIsCurrent,
  useChildIds,
  useItem,
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
}: TreeProps<T>) => {
  const context = useMemo(
    () => ({
      getProps,
      useIsOpen,
      useIsCurrent,
      useChildIds,
      useItem,
    }),
    [getProps, useIsOpen, useIsCurrent, useChildIds, useItem],
  );
  const rootChildIds = useChildIds(root);
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
  };

  return (
    <Treegrid.Root gridTemplateColumns={gridTemplateColumns} classNames={classNames}>
      <TreeProvider value={context}>
        {rootChildIds.map((childId, index) => (
          <TreeItemById key={childId} id={childId} last={index === rootChildIds.length - 1} {...childProps} />
        ))}
      </TreeProvider>
    </Treegrid.Root>
  );
};
