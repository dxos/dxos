//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useState } from 'react';

import { Grid, GridLayout, GridProps } from './Grid';
import { Position } from './layout';
import { MosaicDataItem, MosaicMoveEvent } from '../../mosaic';
import { ComplexCard, TestObjectGenerator } from '../../testing';

export type DemoGridProps = GridProps & {
  initialItems?: MosaicDataItem[];
  initialLayout?: GridLayout;
  types?: string[];
  debug?: boolean;
};

export const DemoGrid = ({
  id = 'grid',
  options = { size: { x: 8, y: 8 } },
  Component = ComplexCard,
  initialItems,
  initialLayout,
  types,
  debug,
  className,
}: DemoGridProps) => {
  const [selected, setSelected] = useState<string>();
  const [items, setItems] = useState<MosaicDataItem[]>(
    initialItems ??
      (() => {
        const generator = new TestObjectGenerator({ types });
        return generator.createObjects({ length: 12 });
      }),
  );
  const [layout, setLayout] = useState<GridLayout>(
    initialLayout ??
      (() =>
        items.reduce<GridLayout>((map, item, i) => {
          map[item.id] = {
            x: faker.number.int({ min: 0, max: (options.size?.x ?? 1) - 1 }),
            y: faker.number.int({ min: 0, max: (options.size?.y ?? 1) - 1 }),
          };
          return map;
        }, {})),
  );

  const handleDrop = ({ active, over }: MosaicMoveEvent<Position>) => {
    if (over.path !== id) {
      setItems((items) => items.filter((item) => item.id !== active.item.id));
    } else {
      setItems((items) => {
        if (items.findIndex((item) => item.id === active.item.id) === -1) {
          return [active.item, ...items];
        } else {
          return items;
        }
      });
      setLayout((layout) => ({ ...layout, [active.item.id]: over.position! }));
    }
  };

  const handleCreate = (position: Position) => {
    setItems((items) => {
      const item = new TestObjectGenerator({ types }).createObject();
      setTimeout(() => {
        setSelected(item.id);
      });
      setLayout((layout) => ({ ...layout, [item.id]: position }));
      return [item, ...items];
    });
  };

  return (
    <Grid
      id={id}
      items={items}
      layout={layout}
      options={options}
      Component={Component}
      className={className}
      debug={debug}
      selected={selected}
      onSelect={setSelected}
      onDrop={handleDrop}
      onCreate={handleCreate}
    />
  );
};
