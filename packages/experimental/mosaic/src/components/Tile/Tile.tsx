//
// Copyright 2023 DXOS.org
//

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import React, { type FC } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { type Bounds, type Item } from '../../layout';
import { type GridLensModel } from '../Grid';

export type TileContentProps<T extends {} = {}> = {
  item: Item<T>;
  selected?: boolean;
  onDelete?: (item: Item<T>) => void;
};

export type TileSlots = {
  root?: {
    className?: string;
  };
  selected?: {
    className?: string;
  };
};

export type TileProps<T extends {}> = {
  item: Item<T>;
  selected?: boolean;
  bounds?: Bounds;
  lensModel?: GridLensModel;
  slots?: TileSlots;
  Content: FC<TileContentProps<T>>;
  onClick?: (item: Item<T>) => void;
  onDelete?: (item: Item<T>) => void;
};

/**
 * Draggable tile element.
 */
export const Tile = <T extends {} = {}>({
  item,
  selected,
  bounds,
  lensModel,
  slots = {},
  Content,
  onClick,
  onDelete,
}: TileProps<T>) => {
  const { attributes, listeners, transform, isDragging, setNodeRef } = useDraggable({ id: item.id });
  const style = {
    width: bounds?.width,
    height: bounds?.height,
    transform: transform
      ? CSS.Transform.toString(
          lensModel
            ? Object.assign(transform, {
                x: transform.x / lensModel.zoom,
                y: transform.y / lensModel.zoom,
              })
            : transform,
        )
      : undefined,
  };

  return (
    <div
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      className={mx(
        'group flex flex-col overflow-hidden',
        isDragging && 'opacity-80',
        slots.root?.className,
        selected && slots?.selected?.className,
      )}
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item);
      }}
    >
      <Content item={item} selected={selected} onDelete={onDelete} />
    </div>
  );
};
