//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Stack, type StackProps } from './Stack';
import {
  type MosaicDataItem,
  type MosaicDropEvent,
  type MosaicMoveEvent,
  type MosaicOperation,
  Path,
} from '../../mosaic';
import { TestObjectGenerator } from '../../testing';

export type DemoStackProps = StackProps & {
  types?: string[];
  count?: number;
  operation?: MosaicOperation;
};

export const DemoStack = ({
  id = 'stack',
  Component,
  types,
  count = 8,
  direction = 'vertical',
  operation = 'transfer',
  debug,
}: DemoStackProps) => {
  const [items, setItems] = useState<MosaicDataItem[]>(() => {
    const generator = new TestObjectGenerator({ types });
    return generator.createObjects({ length: count });
  });

  const handleOver = ({ active }: MosaicMoveEvent<number>) => {
    if (operation === 'reject') {
      return 'reject';
    }

    const exists = items.findIndex((item) => item.id === active.item.id) >= 0;

    if (!exists) {
      return operation;
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
      return [...items];
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
