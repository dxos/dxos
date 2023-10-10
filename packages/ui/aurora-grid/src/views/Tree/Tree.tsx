//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Card, Tree as TreeComponent, TreeItem as TreeItemComponent } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import {
  MosaicContainerProps,
  Mosaic,
  MosaicDataItem,
  MosaicTileComponent,
  useContainer,
  useSortedItems,
  Path,
} from '../../mosaic';

// TODO(burdon): Tree data model that provides a pure abstraction of the plugin Graph.
// - The Tree (like Stack, Grid) is a high level container that assembles Radix style Aurora components from a model.
// - Models in general should be easily mapped from the Graph and/or ECHO queries.
// - See: https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/examples-tree-sortable--basic-setup

export type TreeProps<TData extends MosaicDataItem = TreeData> = MosaicContainerProps<TData, number> & {
  items?: TData[];
  debug?: boolean;
};

export type TreeData = {
  id: string;
  label?: string; // TODO(burdon): Provide adapter.
  children: TreeData[];
};

// TODO(burdon): Make generic (and forwardRef).
export const Tree = ({ id, Component = TreeItem, onDrop, isDroppable, items = [], debug }: TreeProps) => {
  const sortedItems = useSortedItems({ path: id, items });

  return (
    <TreeComponent.Root classNames='flex flex-col overflow-hidden'>
      {/* TODO(wittjosiah): This is Stack.Root. */}
      <Mosaic.Container
        {...{
          id,
          debug,
          Component,
          isDroppable,
          onDrop,
        }}
      >
        <Mosaic.Sortable id={id} items={sortedItems} direction='vertical'>
          {sortedItems.map((item, index) => (
            <TreeItemComponent.Root key={item.id} collapsible defaultOpen>
              <Mosaic.SortableTile item={item} path={id} position={index} Component={Component} />
            </TreeItemComponent.Root>
          ))}
        </Mosaic.Sortable>
      </Mosaic.Container>
    </TreeComponent.Root>
  );
};

/**
 * Pure component that is used by the mosaic overlay.
 */
const TreeItem: MosaicTileComponent<TreeData> = forwardRef(
  ({ path, draggableStyle, draggableProps, item, isActive, isDragging, className }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        style={draggableStyle}
        className={mx('flex flex-col', className, isDragging && 'opacity-20')}
      >
        <Card.Header>
          <Card.DragHandle {...draggableProps} />
          <Card.Title title={item.label ?? Path.create(path, item.id)} classNames='truncate' />
        </Card.Header>

        {!isActive && !isDragging && item.children && <TreeBranch path={path} id={item.id} items={item.children} />}
      </div>
    );
  },
);

const TreeBranch = ({ path: parentPath, id, items }: { path: string; id: string; items: TreeData[] }) => {
  const { Component } = useContainer();
  const path = Path.create(parentPath, 'branch', id);
  const sortedItems = useSortedItems({
    path,
    items,
  });

  return (
    <TreeItemComponent.Body className='pis-4'>
      <Mosaic.Sortable id={path} items={sortedItems} direction='vertical'>
        {sortedItems.map((child, i) => (
          <TreeComponent.Branch key={child.id}>
            <TreeItemComponent.Root collapsible defaultOpen>
              <Mosaic.SortableTile item={child} path={path} position={i} Component={Component!} />
            </TreeItemComponent.Root>
          </TreeComponent.Branch>
        ))}
      </Mosaic.Sortable>
    </TreeItemComponent.Body>
  );
};
