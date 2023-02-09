//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { Item } from '../layout';
import { Tile, TileContentProps } from './Tile';

export type StackProps<T extends {}> = {
  items?: Item<T>[];
  Content?: FC<TileContentProps<T>>;
};

// TODO(burdon): External DndContext.
// TODO(burdon): DndSort.
export const Stack = <T extends {}>({ items = [], Content }: StackProps<T>) => {
  return (
    <div className='flex flex-col bg-white'>
      {items.map((item) => (
        <div key={item.id} className='m-2 border'>
          <Tile<T> item={item} Content={Content} />
        </div>
      ))}
    </div>
  );
};
