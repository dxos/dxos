//
// Copyright 2023 DXOS.org
//

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ArrowsOut, XCircle } from 'phosphor-react';
import React from 'react';

import { getSize, mx } from '@dxos/react-components';

import { Bounds, Item } from './defs';

export type CellProps = {
  item: Item;
  bounds: Bounds;
  slots?: { root?: string };
  level?: number;
  onClick?: (item: Item) => void;
  onZoom?: (item: Item) => void;
  onDelete?: (item: Item) => void;
};

export const Cell = ({ item, bounds, slots = {}, level = 1, onClick, onZoom, onDelete }: CellProps) => {
  const { transform, setNodeRef } = useDraggable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height
  };

  const handleDelete = (event: any) => {
    event.stopPropagation();
    onDelete?.(item);
  };

  const handleZoom = (event: any) => {
    event.stopPropagation();
    onZoom?.(item);
  };

  // prettier-ignore
  return (
    <div
      ref={setNodeRef}
      className={mx(
        bounds && 'absolute',
        'group',
        'flex flex-col overflow-hidden snap-center p-3',
        slots.root
      )}
      style={style}
      // onClick={(event) => {
      //   event.stopPropagation();
      //   onClick?.(item);
      // }}
    >
      <div className='flex flex-col overflow-hidden'>
        <div className='flex w-full items-center mb-3'>
          {/* Title */}
          <div className='flex flex-1 overflow-hidden'>
            <h2 className='text-lg overflow-hidden text-ellipsis whitespace-nowrap'>{item.label}</h2>
          </div>

          {/* Icons */}
          <div className='flex flex-shrink-0 pl-3'>
            <div className='invisible group-hover:visible text-gray-500'>
              {level === 0 && (
                <button onClick={handleDelete}>
                  <XCircle className={getSize(6)} />
                </button>
              )}
              {level === 1 && (
                <button onClick={handleZoom}>
                  <ArrowsOut className={getSize(6)} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className='flex overflow-hidden text-gray-600'>
          {item.content}
        </div>
      </div>
    </div>
  );
};
