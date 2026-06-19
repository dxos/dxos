//
// Copyright 2024 DXOS.org

import { useAtomValue } from '@effect-atom/atom-react';
import React, { type ReactNode, useMemo } from 'react';

import { Treegrid, type TreegridRootProps } from '@dxos/react-ui';

import { type TreeModel, TreeProvider } from './TreeContext';
import { TreeItemById, type TreeItemByIdProps, type TreeItemProps } from './TreeItem';

export type TreeProps<T extends { id: string } = any> = {
  model: TreeModel<T>;
  rootId?: string;
  path?: string[];
  id: string;
  /** Called between consecutive root-level items; return a ReactNode to render a separator (e.g. a `<hr>`). */
  renderSeparatorBefore?: (currentId: string, prevId: string | undefined) => ReactNode;
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
  renderSeparatorBefore,
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
          <React.Fragment key={childId}>
            {renderSeparatorBefore?.(childId, index > 0 ? childIds[index - 1] : undefined)}
            <TreeItemById id={childId} last={index === childIds.length - 1} {...childProps} />
          </React.Fragment>
        ))}
      </TreeProvider>
    </Treegrid.Root>
  );
};
