//
// Copyright 2023 DXOS.org
//

import { ArrowsOut, XCircle } from 'phosphor-react';
import React from 'react';

import { getSize, mx } from '@dxos/react-components';

import { Bounds, Item } from './defs';

export type CellProps = {
  item: Item;
  bounds?: Bounds;
  className?: string;
  level?: number;
  onClick?: (item: Item) => void;
  onZoom?: (item: Item) => void;
  onDelete?: (item: Item) => void;
};

export const Cell = ({ item, bounds, className, level = 1, onClick, onZoom, onDelete }: CellProps) => {
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
      className={mx(
        bounds && 'absolute',
        'group',
        'flex flex-col overflow-hidden p-2',
        className
      )}
      style={bounds && { left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item);
      }}
    >
      <div className='flex flex-col overflow-hidden'>
        <div className='flex w-full items-center text-sm mb-2'>
          <div className='flex flex-1 overflow-hidden'>
            <h2 className='overflow-hidden text-ellipsis whitespace-nowrap'>{item.label}</h2>
          </div>
          <div className='flex flex-shrink-0 pl-2'>
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

        <div className='flex overflow-hidden text-xs text-gray-600'>
          {item.content}
        </div>
      </div>
    </div>
  );
};
