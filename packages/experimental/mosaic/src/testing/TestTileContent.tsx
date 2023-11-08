//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { XCircle } from '@phosphor-icons/react';
import React from 'react';

import { getSize } from '@dxos/react-ui-theme';

import { type TileContentProps } from '../components';
import { type TestData } from '../testing';

export const TestTileContent = ({ item, onDelete }: TileContentProps<TestData>) => {
  const handleDelete = (event: any) => {
    event.stopPropagation();
    onDelete?.(item);
  };

  return (
    <div className='flex flex-1 flex-col overflow-hidden p-3'>
      <div className='flex w-full items-center mb-3'>
        {/* Title */}
        <div className='flex flex-1 overflow-hidden'>
          <h2 className='text-lg overflow-hidden text-ellipsis whitespace-nowrap'>{item.data?.title}</h2>
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
      <div className='flex flex-1 overflow-hidden text-gray-600'>{item.data?.description}</div>
    </div>
  );
};
