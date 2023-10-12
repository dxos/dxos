//
// Copyright 2023 DXOS.org
//

import React, { useRef, useState } from 'react';

import { Stack, StackProps } from './Stack';
import { MosaicDataItem, MosaicDropEvent, MosaicMoveEvent, MosaicOperation, Path } from '../../mosaic';
import { TestObjectGenerator } from '../../testing';

export type DemoStackProps = StackProps & {
  types?: string[];
  count?: number;
  behavior?: MosaicOperation;
};

export const DemoStack = ({
  id = 'stack',
  Component,
  types,
  count = 8,
  direction = 'vertical',
  behavior = 'adopt',
  debug,
}: DemoStackProps) => {
  const [items, setItems] = useState<MosaicDataItem[]>(() => {
    const generator = new TestObjectGenerator({ types });
    return generator.createObjects({ length: count });
  });

  const itemsRef = useRef(items);

  const handleOver = ({ active }: MosaicMoveEvent<number>) => {
    // TODO(wittjosiah): Items is stale here for some inexplicable reason, so ref helps.
    if (behavior === 'reject') {
      return 'reject';
    }

    const exists = itemsRef.current.findIndex((item) => item.id === active.item.id) >= 0;

    if (!exists) {
      return behavior;
    } else {
      return 'reject';
    }
  };

  const handleDrop = ({ operation, active, over }: MosaicDropEvent<number>) => {
    setItems((items) => {
      if (
        active.path === Path.create(id, active.item.id) &&
        (operation !== 'copy' || over.path === Path.create(id, over.item.id))
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
