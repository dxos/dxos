//
// Copyright 2023 DXOS.org
//

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { XCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { getSize, mx } from '@dxos/react-components';

import { Box2, MosaicItem } from '../props';

export type TileContentProps<T extends {} = {}> = {
  item: MosaicItem<T>;
  selected?: boolean;
  onDelete?: (item: MosaicItem<T>) => void;
};

export const DefaultTileContent = <T extends {}>({ item, onDelete }: TileContentProps<T>) => {
  const handleDelete = (event: any) => {
    event.stopPropagation();
    onDelete?.(item);
  };

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <div className='flex w-full items-center mb-3'>
        {/* Title */}
        <div className='flex flex-1 overflow-hidden'>
          <h2 className='text-lg overflow-hidden text-ellipsis whitespace-nowrap'>{item.label}</h2>
        </div>

        {/* Icons */}
        <div className='flex shrink-0 pl-3'>
          <div className='invisible group-hover:visible text-gray-500'>
            <button onClick={handleDelete}>
              <XCircle className={getSize(6)} />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className='flex flex-1 overflow-hidden text-gray-600'>{item.content}</div>
    </div>
  );
};

export type TileClasses = {
  root?: string;
  selected?: string;
};

export type TileProps<T extends {}> = {
  item: MosaicItem<T>;
  box?: Box2;
  classes?: TileClasses;
  selected?: boolean;
  Content?: FC<TileContentProps<T>>;
  onClick?: (item: MosaicItem<T>) => void;
  onDelete?: (item: MosaicItem<T>) => void;
};

/**
 * Draggable tile element.
 */
export const Tile = <T extends {} = {}>({
  item,
  box,
  classes = {},
  selected,
  Content = DefaultTileContent,
  onClick,
  onDelete
}: TileProps<T>) => {
  const { attributes, listeners, transform, isDragging, setNodeRef } = useDraggable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    width: `${box?.size.x}px`,
    height: `${box?.size.y}px`
  };

  return (
    <div
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      className={mx(
        'group',
        'flex flex-col overflow-hidden p-3',
        isDragging && 'opacity-80',
        classes.root,
        selected && classes?.selected
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
