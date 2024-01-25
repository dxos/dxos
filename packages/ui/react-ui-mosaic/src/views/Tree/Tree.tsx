//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { Tree as TreeComponent, TreeItem as TreeItemComponent } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-card';
import { dropRing, mx } from '@dxos/react-ui-theme';

import {
  type MosaicContainerProps,
  Mosaic,
  type MosaicDataItem,
  type MosaicTileComponent,
  useContainer,
  useMosaic,
  Path,
  useItemsWithOrigin,
} from '../../mosaic';

// TODO(burdon): Tree data model that provides a pure abstraction of the plugin Graph.
// - The Tree (like Stack, Grid) is a high level container that assembles Radix style DXOS UI components from a model.
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
export const Tree = ({ id, Component = TreeItem, onOver, onDrop, items = [], debug }: TreeProps) => {
  return (
    <Mosaic.Container
      {...{
        id,
        debug,
        Component,
        onOver,
        onDrop,
      }}
    >
      <TreeRoot items={items} />
    </Mosaic.Container>
  );
};

const TreeRoot = ({ items }: { items: TreeData[] }) => {
  const { id, Component } = useContainer();
  const itemsWithOrigin = useItemsWithOrigin(id, items);

  return (
    <TreeComponent.Root classNames='flex flex-col'>
      <Mosaic.SortableContext id={id} items={itemsWithOrigin} direction='vertical'>
        {itemsWithOrigin.map((item, index) => (
          <TreeItemComponent.Root key={item.id} collapsible defaultOpen>
            <Mosaic.SortableTile item={item} path={id} position={index} Component={Component!} />
          </TreeItemComponent.Root>
        ))}
      </Mosaic.SortableContext>
    </TreeComponent.Root>
  );
};

/**
 * Pure component that is used by the mosaic overlay.
 */
const TreeItem: MosaicTileComponent<TreeData> = forwardRef(
  ({ path, draggableStyle, draggableProps, item, operation, active, isOver, isDragging, classNames }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        style={draggableStyle}
        className={mx(
          'flex flex-col rounded',
          (active === 'rearrange' || active === 'origin') && 'opacity-0',
          active === 'destination' && 'opacity-20',
          isOver && dropRing,
          classNames,
        )}
      >
        <Card.Header>
          <Card.DragHandle {...draggableProps} />
          <Card.Title title={item.label ?? path} classNames='truncate' />
        </Card.Header>

        {!active && item.children && <TreeBranch path={path} items={item.children} />}
      </div>
    );
  },
);

const TreeBranch = ({ path, items }: { path: string; items: TreeData[] }) => {
  const { operation, overItem } = useMosaic();
  const { Component } = useContainer();
  const itemsWithOrigin = useItemsWithOrigin(path, items);

  return (
    <TreeItemComponent.Body className='pis-4'>
      <Mosaic.SortableContext id={path} items={itemsWithOrigin} direction='vertical'>
        {itemsWithOrigin.map((child, index) => (
          <TreeComponent.Branch key={child.id}>
            <TreeItemComponent.Root collapsible defaultOpen>
              <Mosaic.SortableTile
                item={child}
                path={path}
                position={index}
                Component={Component!}
                isOver={
                  overItem?.path === Path.create(path, child.id) && (operation === 'transfer' || operation === 'copy')
                }
              />
            </TreeItemComponent.Root>
          </TreeComponent.Branch>
        ))}
      </Mosaic.SortableContext>
    </TreeItemComponent.Body>
  );
};
