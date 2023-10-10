//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { FC, HTMLAttributes, useState } from 'react';

import { TestComponentProps } from './test';
import { MosaicMoveEvent, MosaicDataItem } from '../../mosaic';
import { TestObjectGenerator } from '../../testing';
import { Stack } from '../Stack';

export const DemoStack: FC<TestComponentProps<any> & HTMLAttributes<HTMLDivElement>> = ({
  id,
  types,
  debug,
  Component,
}) => {
  const [items, setItems] = useState<MosaicDataItem[]>(() => {
    const generator = new TestObjectGenerator({ types });
    return generator.createObjects({ length: 10 });
  });

  const handleDrop = ({ active, over }: MosaicMoveEvent<number>) => {
    setItems((items) => {
      if (active.path === id) {
        items.splice(active.position!, 1);
      }
      if (over.path === id) {
        items.splice(over.position!, 0, active.item);
      }
      return [...items];
    });
  };

  return <Stack id={id} items={items} Component={Component} onDrop={handleDrop} debug={debug} />;
};
