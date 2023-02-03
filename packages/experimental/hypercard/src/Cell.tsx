//
// Copyright 2023 DXOS.org
//

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { XCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { getSize, mx } from '@dxos/react-components';

import { Bounds, Item } from './defs';

export type CellContentProps = { item: Item; onDelete?: (item: Item) => void };

// TODO(burdon): Factor out.
export const CellContent = ({ item, onDelete }: CellContentProps) => {
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

export type CellSlots = {
  root?: string;
  selected?: string;
};

export type CellProps = {
  item: Item;
  bounds: Bounds;
  slots?: CellSlots;
  selected?: boolean;
  Content?: FC<CellContentProps>;
  onClick?: (item: Item) => void;
  onDelete?: (item: Item) => void;
};

export const Cell = ({ item, bounds, slots = {}, selected, Content = CellContent, onClick, onDelete }: CellProps) => {
  const { attributes, listeners, transform, isDragging, setNodeRef } = useDraggable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    width: bounds.width,
    height: bounds.height
  };

  // prettier-ignore
  return (
    <div
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      className={mx(
        'group',
        'flex flex-col overflow-hidden snap-center p-3',
        isDragging && 'opacity-80',
        slots.root,
        selected && slots?.selected
      )}
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item);
      }}
    >
      <Content item={item} onDelete={onDelete} />
    </div>
  );
};
