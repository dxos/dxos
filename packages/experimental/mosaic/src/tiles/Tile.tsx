//
// Copyright 2023 DXOS.org
//

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'phosphor-react';
import React from 'react';

import { Button, getSize, mx } from '@dxos/react-components';

import { Vec2, TileRequiredProps } from '../props';

export type TileProps<T extends TileRequiredProps> = {
  tile: T;
  extrinsicSize?: Vec2;
  selected?: boolean;
  onClick?: (tile: T) => void;
  onDelete?: (tile: T) => void;
};

/**
 * Draggable tile element.
 */
export const Tile = <T extends TileRequiredProps>({
  tile,
  extrinsicSize,
  selected,
  onClick,
  onDelete
}: TileProps<T>) => {
  const { attributes, listeners, transform, isDragging, setNodeRef } = useDraggable({ id: tile.id });
  const style = {
    ...(extrinsicSize && {
      width: extrinsicSize.x,
      height: extrinsicSize.y
    }),
    transform: CSS.Transform.toString(transform)
  };

  return (
    <div
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      className={mx('group', 'flex flex-col p-3 bg-white shadow', isDragging && 'opacity-80 z-50 shadow-lg')}
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(tile);
      }}
    >
      <div className='flex flex-1 flex-col overflow-hidden'>
        <div className='flex w-full items-center mb-3'>
          {/* Title */}
          <div className='flex flex-1 overflow-hidden'>
            <h2 className='text-lg overflow-hidden text-ellipsis whitespace-nowrap'>{tile.label}</h2>
          </div>

          {/* Icons */}
          {onDelete && (
            <Button compact variant='ghost' onClick={() => onDelete(tile)} className='flex shrink-0 pl-3'>
              <X className={getSize(4)} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
