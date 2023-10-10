//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, HTMLAttributes, useState } from 'react';

import { TestComponentProps } from './test';
import { MosaicMoveEvent, MosaicDataItem } from '../../mosaic';
import { TestObjectGenerator } from '../../testing';
import { Grid, GridLayout, Position } from '../Grid';

export const DemoGrid: FC<TestComponentProps<any> & HTMLAttributes<HTMLDivElement>> = ({
  id,
  types,
  debug,
  Component,
  className,
}) => {
  const size = { x: 4, y: 6 };
  const [gridItems, setGridItems] = useState<MosaicDataItem[]>(() => {
    const generator = new TestObjectGenerator({ types });
    return generator.createObjects({ length: 12 });
  });
  const [layout, setLayout] = useState<GridLayout>(() =>
    gridItems.reduce<GridLayout>((map, item, i) => {
      map[item.id] = {
        x: faker.number.int({ min: 0, max: size.x - 1 }),
        y: faker.number.int({ min: 0, max: size.y - 1 }),
      };
      return map;
    }, {}),
  );

  const handleDrop = ({ container, active, over }: MosaicMoveEvent<Position>) => {
    if (over.container !== container) {
      setGridItems((items) => items.filter((item) => item.id !== active.item.id));
    } else {
      setGridItems((items) => {
        if (items.findIndex((item) => item.id === active.item.id) === -1) {
          return [active.item, ...items];
        } else {
          return items;
        }
      });

      setLayout((layout) => ({ ...layout, [active.item.id]: over.position! }));
    }
  };

  return (
    <Grid
      id={id}
      items={gridItems}
      layout={layout}
      size={size}
      Component={Component}
      onDrop={handleDrop}
      debug={debug}
      className={className}
    />
  );
};
