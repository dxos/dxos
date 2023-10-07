//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { forwardRef, useMemo } from 'react';

import { Card } from '@dxos/aurora';
import { groupSurface, mx } from '@dxos/aurora-theme';

import {
  MosaicContainerProps,
  Mosaic,
  MosaicDataItem,
  Path,
  useSortedItems,
  MosaicTileComponent,
  useContainer,
} from '../../mosaic';

// Example:
// https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/presets-sortable-multiple-containers--basic-setup

export type KanbanColumn<TData extends MosaicDataItem = MosaicDataItem> = MosaicDataItem & {
  title: string;
  children: TData[];
};

export type KanbanProps<TData extends MosaicDataItem = MosaicDataItem> = MosaicContainerProps<TData, number> & {
  columns: KanbanColumn<TData>[];
  debug?: boolean;
};

export const Kanban = ({
  id,
  columns,
  Component: TileComponent = Mosaic.DefaultComponent,
  debug,
  onDrop,
}: KanbanProps) => {
  const Component = useMemo(() => OverlayComponent(id, TileComponent), [id, TileComponent]);

  return (
    <Mosaic.Container
      {...{
        id,
        debug,
        Component,
        // Restrict columns to x-axis.
        modifier: (item, { transform }) => (item.container === id ? { ...transform, y: 0 } : transform),
        onDrop,
      }}
    >
      <Mosaic.Sortable items={columns} direction='horizontal'>
        <div className='flex grow overflow-y-hidden overflow-x-auto'>
          <div className='flex gap-4'>
            {columns.map((column, index) => (
              <Mosaic.SortableTile
                key={column.id}
                item={column}
                container={id}
                position={index}
                Component={Component}
                debug={debug}
              />
            ))}
          </div>
        </div>
      </Mosaic.Sortable>
    </Mosaic.Container>
  );
};

const OverlayComponent = (id: string, Component: MosaicTileComponent<any>): MosaicTileComponent<any> =>
  forwardRef((props, ref) => {
    if (props.container === id && props.isActive) {
      return (
        // TODO(wittjosiah): Why does it need to be the data id for reordering to work?
        <Mosaic.Container {...{ id: props.item.id, Component }}>
          <KanbanColumnComponent {...props} ref={ref} />
        </Mosaic.Container>
      );
    }

    return props.container === id ? <KanbanColumnComponent {...props} ref={ref} /> : <Component {...props} ref={ref} />;
  });

const KanbanColumnComponent: MosaicTileComponent<KanbanColumn> = forwardRef(
  ({ container, position, item, isDragging, draggableStyle, draggableProps, debug }, forwardRef) => {
    const { id, title, children } = item;
    const { Component } = useContainer();
    const column = Path.create(container, 'column', id);
    const sortedItems = useSortedItems({ container: column, items: children });

    // TODO(burdon): Doesn't drop at end.
    // TODO(burdon): Rename "container" property to "path".
    const { setNodeRef } = useDroppable({ id: column, data: { container: column, item, position } });

    return (
      <div
        ref={forwardRef}
        className={mx(
          groupSurface,
          'flex flex-col w-[300px] snap-center overflow-hidden h-full m-1',
          isDragging && 'opacity-20',
        )}
        style={draggableStyle}
      >
        <Card.Root classNames='shrink-0 bg-cyan-200'>
          <Card.Header>
            <Card.DragHandle {...draggableProps} />
            <Card.Title title={title} />
            <Card.Menu />
          </Card.Header>
        </Card.Root>

        <Mosaic.Sortable id={column} items={sortedItems} direction='vertical'>
          <div ref={setNodeRef} className={mx('flex flex-col grow overflow-y-scroll')}>
            <div className='flex flex-col m-2 my-3 gap-2'>
              {sortedItems.map((item, i) => (
                <Mosaic.SortableTile key={item.id} item={item} container={column} position={i} Component={Component!} />
              ))}
            </div>
          </div>
          {debug && <Mosaic.Debug data={{ container, id, items: sortedItems.length }} />}
        </Mosaic.Sortable>
      </div>
    );
  },
);
