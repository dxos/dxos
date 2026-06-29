//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { type TreegridRootProps, Treegrid } from '../Treegrid';
import { type TreeModel, TreeProvider } from './TreeContext';
import { type TreeItemByIdProps, type TreeItemProps, TreeItemById } from './TreeItem';

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

/** Renders a single root-level child. */
const TreeChild = <T extends { id: string } = any>({
  id,
  path: parentPath,
  last,
  ...childProps
}: TreeItemByIdProps & { last: boolean }) => {
  return <TreeItemById id={id} path={parentPath} last={last} {...childProps} />;
};

export const Tree = <T extends { id: string } = any>({
  classNames,
  model,
  rootId,
  path,
  id,
  draggable = false,
  gridTemplateColumns = '[tree-row-start] minmax(0, 1fr) min-content [tree-row-end]',
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
          <TreeChild key={childId} id={childId} last={index === childIds.length - 1} {...childProps} />
        ))}
      </TreeProvider>
    </Treegrid.Root>
  );
};
