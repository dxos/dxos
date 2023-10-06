//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/aurora-theme';

import { Mosaic, MosaicContainerProps, MosaicDataItem, useSortedItems } from '../../mosaic';

export type Direction = 'horizontal' | 'vertical';

export type StackProps<TData extends MosaicDataItem = MosaicDataItem> = MosaicContainerProps<TData, number> & {
  items?: TData[];
  direction?: Direction;
  debug?: boolean;
};

// TODO(burdon): Make generic (and forwardRef).
export const Stack = ({
  id,
  Component = Mosaic.DefaultComponent,
  onDrop,
  isDroppable,
  items = [],
  direction = 'vertical',
  debug,
}: StackProps) => {
  const sortedItems = useSortedItems({ container: id, items });

  return (
    <div className={mx('flex overflow-hidden', direction === 'vertical' && 'w-[300px]')}>
      <Mosaic.Container {...{ id, Component, isDroppable, onDrop }}>
        <Mosaic.Sortable items={sortedItems} direction={direction}>
          <div className={mx('flex flex-col', direction === 'vertical' ? 'overflow-y-auto' : 'overflow-x-auto')}>
            <div className={mx('flex gap-4', direction === 'vertical' && 'flex-col')}>
              {sortedItems.map((item, i) => (
                <Mosaic.SortableTile
                  key={item.id}
                  item={item}
                  container={id}
                  position={i}
                  Component={Component}
                  debug={debug}
                />
              ))}
            </div>
            {debug && <Mosaic.Debug data={{ id: 'stack', items: sortedItems.length }} />}
          </div>
        </Mosaic.Sortable>
      </Mosaic.Container>
    </div>
  );
};
