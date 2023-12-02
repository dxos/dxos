//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import { Mosaic, type MosaicContainerProps, type MosaicDataItem, useItemsWithPreview } from '../../mosaic';

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
  onOver,
  onDrop,
  items = [],
  direction = 'vertical',
  debug,
}: StackProps) => {
  const itemsWithPreview = useItemsWithPreview({ path: id, items });

  return (
    <div className={mx('flex overflow-hidden', direction === 'vertical' && 'w-[300px]')}>
      <div
        className={mx('flex flex-col w-full my-1', direction === 'vertical' ? 'overflow-y-auto' : 'overflow-x-auto')}
      >
        <Mosaic.Container {...{ id, Component, onOver, onDrop }}>
          <Mosaic.SortableContext items={itemsWithPreview} direction={direction}>
            {itemsWithPreview.map((item, index) => (
              <Mosaic.SortableTile
                key={item.id}
                item={item}
                path={id}
                position={index}
                className='m-1'
                // debug={debug}
              />
            ))}
          </Mosaic.SortableContext>
        </Mosaic.Container>
        {debug && (
          <div className='grow'>
            <Mosaic.Debug data={{ id, items: itemsWithPreview.length }} />
          </div>
        )}
      </div>
    </div>
  );
};
