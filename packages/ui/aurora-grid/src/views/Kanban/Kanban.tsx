//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { forwardRef, useMemo } from 'react';

import { Card } from '@dxos/aurora';
import { groupSurface, mx } from '@dxos/aurora-theme';

import {
  Mosaic,
  MosaicContainerProps,
  MosaicDataItem,
  MosaicTileComponent,
  Path,
  useSortedItems,
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
        modifier: (item, { transform }) => (item.path === id ? { ...transform, y: 0 } : transform),
        onDrop,
      }}
    >
      <div className='grow flex overflow-y-hidden overflow-x-auto'>
        <div className='flex'>
          <Mosaic.SortableContext items={columns} direction='horizontal'>
            {columns.map((column, index) => (
              <Mosaic.SortableTile
                key={column.id}
                item={column}
                path={id}
                position={index}
                Component={Component}
                debug={debug}
              />
            ))}
          </Mosaic.SortableContext>
        </div>
      </div>
    </Mosaic.Container>
  );
};

const OverlayComponent = (id: string, Component: MosaicTileComponent<any>): MosaicTileComponent<any> =>
  forwardRef((props, ref) => {
    if (props.path === id && props.isActive) {
      return (
        // Needs to not override the main kanban path.
        <Mosaic.Container {...{ id: `${id}-active`, Component }}>
          <KanbanColumnComponent {...props} ref={ref} />
        </Mosaic.Container>
      );
    }

    return props.path === id ? <KanbanColumnComponent {...props} ref={ref} /> : <Component {...props} ref={ref} />;
  });

const KanbanColumnComponent: MosaicTileComponent<KanbanColumn> = forwardRef(
  ({ path, item, isDragging, draggableStyle, draggableProps, debug }, forwardRef) => {
    const { id, title, children } = item;
    const { Component } = useContainer();
    const column = Path.create(path, 'column', id);
    const sortedItems = useSortedItems({ path: column, items: children });

    // TODO(burdon): If columns use useSortableItem, then this is not needed -- unless we want to limit the scope of the drop-zone to the items flex.
    // TODO(burdon): Currently inserted in the wrong place.
    const { setNodeRef } = useDroppable({ id, data: { path: column } });

    return (
      <div role='none' className='grow flex flex-col' ref={forwardRef}>
        <div
          className={mx(
            groupSurface,
            'grow flex flex-col w-[300px] snap-center overflow-hidden m-1',
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

          <div ref={setNodeRef} className={mx('flex flex-col grow overflow-y-scroll')}>
            <div className='flex flex-col'>
              <Mosaic.SortableContext id={column} items={sortedItems} direction='vertical'>
                {sortedItems.map((item, index) => (
                  <Mosaic.SortableTile
                    key={item.id}
                    item={item}
                    path={column}
                    position={index}
                    Component={Component!}
                  />
                ))}
              </Mosaic.SortableContext>
            </div>
          </div>
          {debug && <Mosaic.Debug data={{ path, id, items: sortedItems.length }} />}
        </div>
      </div>
    );
  },
);
