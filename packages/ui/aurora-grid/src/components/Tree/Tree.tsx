//
// Copyright 2023 DXOS.org
//

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { PropsWithChildren, forwardRef } from 'react';

import { Card, Tree as TreeComponent, TreeItem as TreeItemComponent } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import {
  MosaicContainerProps,
  MosaicContainer,
  MosaicDataItem,
  MosaicDraggedItem,
  MosaicTileComponent,
  useContainer,
  useSortedItems,
  getTransformCSS,
} from '../../dnd';

// TODO(burdon): Tree data model that provides a pure abstraction of the plugin Graph.
// - The Tree (like Stack, Grid) is a high level container that assembles Radix style Aurora components from a model.
// - Models in general should be easily mapped from the Graph and/or ECHO queries.
// - See: https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/examples-tree-sortable--basic-setup

type TreeRootProps<TData extends MosaicDataItem> = MosaicContainerProps<TData, number> & {
  items?: TData[];
};

const TreeRoot = ({
  id,
  debug,
  items = [],
  Component = TreeItem,
  isDroppable,
  onDrop,
  children,
}: PropsWithChildren<TreeRootProps<any>>) => {
  return (
    <TreeComponent.Root classNames='flex flex-col'>
      {/* TODO(wittjosiah): This is Stack.Root. */}
      <MosaicContainer
        container={{
          id,
          debug,
          Component,
          isDroppable,
          onDrop,
        }}
      >
        <SortableContext id={id} items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </MosaicContainer>
    </TreeComponent.Root>
  );
};

export type TreeData = {
  id: string;
  label?: string;
  children: TreeData[];
};

/**
 * Pure component that is used by the mosaic overlay.
 */
const TreeItem: MosaicTileComponent<TreeData> = forwardRef(
  ({ container, draggableStyle, draggableProps, data, position, isActive, isDragging, className }, forwardedRef) => {
    return (
      <div ref={forwardedRef} style={draggableStyle} className={mx('flex flex-col', className)}>
        <Card.Header>
          <Card.DragHandle {...draggableProps} />
          <Card.Title title={data.label ?? `${container}/${data.id}`} classNames='truncate' />
        </Card.Header>
        {!isActive && !isDragging && data.children && (
          <TreeBranch container={container} id={data.id} items={data.children} />
        )}
      </div>
    );
  },
);

const TreeBranch = ({ container, id, items }: { container: string; id: string; items: TreeData[] }) => {
  const parent = `${container}/branch/${id}`;
  const sortedItems = useSortedItems({
    container: parent,
    items,
  });

  return (
    <TreeItemComponent.Body className='pis-4'>
      <SortableContext id={id} items={sortedItems} strategy={verticalListSortingStrategy}>
        {sortedItems.map((child, i) => (
          <TreeComponent.Branch key={child.id}>
            <TreeTile item={child} parent={parent} index={i} />
          </TreeComponent.Branch>
        ))}
      </SortableContext>
    </TreeItemComponent.Body>
  );
};

// TODO(burdon): Draggable item.
const TreeTile = ({
  item,
  index,
  parent,
  onSelect,
}: {
  item: TreeData;
  index: number;
  parent?: string;
  onSelect?: () => void;
}) => {
  const { id: container, Component = TreeItem } = useContainer();
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { container: parent ?? container, item, position: index } satisfies MosaicDraggedItem,
  });

  return (
    <TreeItemComponent.Root collapsible defaultOpen>
      {/* TODO(burdon): Should this be a tile? */}
      <Component
        ref={setNodeRef}
        data={item}
        container={parent ?? container}
        position={index}
        isDragging={isDragging}
        draggableStyle={{
          transform: getTransformCSS(transform),
          transition,
        }}
        draggableProps={{ ...attributes, ...listeners }}
        className={mx(isDragging && 'opacity-0')}
        onSelect={onSelect}
      />
    </TreeItemComponent.Root>
  );
};

export const Tree = {
  Root: TreeRoot,
  Tile: TreeTile,
};
