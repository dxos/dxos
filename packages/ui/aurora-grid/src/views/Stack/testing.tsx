//
// Copyright 2023 DXOS.org
//

import React, { useRef, useState } from 'react';

import { Stack, StackProps } from './Stack';
import { MosaicDataItem, MosaicMoveEvent, Path } from '../../mosaic';
import { TestObjectGenerator } from '../../testing';

export type DemoStackProps = StackProps & {
  types?: string[];
  count?: number;
  behavior?: 'move' | 'copy' | 'disallow';
};

export const DemoStack = ({
  id = 'stack',
  Component,
  types,
  count = 8,
  direction = 'vertical',
  behavior = 'move',
  debug,
}: DemoStackProps) => {
  const [items, setItems] = useState<MosaicDataItem[]>(() => {
    const generator = new TestObjectGenerator({ types });
    return generator.createObjects({ length: count });
  });

  const itemsRef = useRef(items);

  const handleOver = ({ active, over }: MosaicMoveEvent<number>) => {
    return (
      // TODO(wittjosiah): Items is stale here for some inexplicable reason, so ref helps.
      (itemsRef.current.findIndex((item) => item.id === active.item.id) === -1 || active.path === over.path) &&
      (active.path === id || behavior !== 'disallow')
    );
  };

  const handleDrop = ({ active, over }: MosaicMoveEvent<number>) => {
    setItems((items) => {
      if (
        active.path === Path.create(id, active.item.id) &&
        (behavior !== 'copy' || over.path === Path.create(id, over.item.id))
      ) {
        items.splice(active.position!, 1);
      }
      if (over.item && over.path === Path.create(id, over.item.id)) {
        items.splice(over.position!, 0, active.item);
      }
      const i = [...items];
      itemsRef.current = i;
      return i;
    });
  };

  return (
    <Stack
      id={id}
      Component={Component}
      onOver={handleOver}
      onDrop={handleDrop}
      items={items}
      direction={direction}
      debug={debug}
    />
  );
};
