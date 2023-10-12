//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useState } from 'react';

import { Mosaic, MosaicDropEvent, Path } from '@dxos/aurora-grid/next';

import { Stack, StackProps, StackSectionItem } from './Stack';
import { TestObjectGenerator } from '../testing';

faker.seed(3);

export default {
  component: Stack,
  render: ({ debug, ...args }: DemoStackProps & { debug: boolean }) => {
    return (
      <Mosaic.Root debug={debug}>
        <Mosaic.DragOverlay />
        <DemoStack {...args} />
      </Mosaic.Root>
    );
  },
};

export const Default = {
  args: {
    count: 8,
    debug: true,
  },
};

export const Complex = {
  args: {
    Component: ({ data }: { data: StackSectionItem & { body?: string; image?: string } }) => (
      <div className='flex'>
        <div className='grow p-4'>
          <h1>{data.title ?? data.id}</h1>
          {data.body && <p>{data.body}</p>}
        </div>
        {data.image && <img src={data.image} />}
      </div>
    ),
    types: ['document', 'image'],
    count: 8,
    debug: true,
  },
};

export type DemoStackProps = StackProps & {
  types?: string[];
  count?: number;
};

const DemoStack = ({ id = 'stack', Component, types, count = 8, direction = 'vertical' }: DemoStackProps) => {
  const [items, setItems] = useState<StackSectionItem[]>(() => {
    const generator = new TestObjectGenerator({ types });
    return generator.createObjects({ length: count });
  });

  const handleDrop = ({ active, over }: MosaicDropEvent<number>) => {
    setItems((items) => {
      if (active.path === Path.create(id, active.item.id)) {
        items.splice(active.position!, 1);
      }
      if (over.path === Path.create(id, over.item.id)) {
        items.splice(over.position!, 0, active.item as StackSectionItem);
      }
      return [...items];
    });
  };

  return <Stack id={id} Component={Component} onDrop={handleDrop} items={items} direction={direction} />;
};
