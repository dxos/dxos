//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

export type Item = {
  id: string;
  label: string;
  children?: Item[];
};

export type Bounds = { x: number; y: number; width: number; height: number };

export type Layout = (item: Item) => Bounds;

export const Box: FC<{ item: Item; bounds: Bounds }> = ({ item, bounds }) => {
  // prettier-ignore
  return (
    <div
      className='absolute flex justify-center items-center bg-white border border-blue-500'
      style={{ left: bounds.x + 'px', top: bounds.y + 'px', width: bounds.width, height: bounds.height }}
    >
      {item.label}
    </div>
  );
};

export const Grid: FC<{ items?: Item[]; layout: Layout }> = ({ items = [], layout }) => {
  // TODO(burdon): Recursive layout.
  // TODO(burdon): Cache layout and trigger on update.
  return (
    <div className='flex flex-1 overflow-hidden'>
      {items.map((item) => (
        <Box key={item.id} item={item} bounds={layout(item)} />
      ))}
    </div>
  );
};
