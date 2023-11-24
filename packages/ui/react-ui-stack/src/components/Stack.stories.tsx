//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useRef, useState } from 'react';

import { Mosaic, type MosaicDropEvent, type MosaicMoveEvent, type MosaicOperation, Path } from '@dxos/react-ui-mosaic';

import { Stack, type StackSectionContent, type StackProps, type StackSectionItem } from './Stack';
import { FullscreenDecorator, TestObjectGenerator } from '../testing';

faker.seed(3);

const SimpleContent = ({ data }: { data: StackSectionContent }) => <div className='p-4 text-center'>{data.title}</div>;

const ComplexContent = ({ data }: { data: StackSectionContent & { body?: string; image?: string } }) => (
  <div className='flex'>
    <div className='grow p-4'>
      <h1>{data.title ?? data.id}</h1>
      {data.body && <p>{data.body}</p>}
    </div>
    {data.image && <img src={data.image} />}
  </div>
);

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

export const Empty = {
  args: {
    SectionContent: SimpleContent,
    count: 0,
  },
};

export const Simple = {
  args: {
    SectionContent: SimpleContent,
    types: ['document'],
    debug: true,
  },
};

export const Complex = {
  args: {
    SectionContent: ComplexContent,
    types: ['document', 'image'],
    debug: true,
  },
};

export const Transfer = {
  args: {
    SectionContent: SimpleContent,
    types: ['document'],
    count: 8,
    className: 'w-[400px]',
  },
  render: ({ debug, ...args }: DemoStackProps & { debug: boolean }) => {
    return (
      <Mosaic.Root debug={debug}>
        <Mosaic.DragOverlay />
        <div className='flex grow justify-center p-4'>
          <div className='grid grid-cols-2 gap-4'>
            <DemoStack {...args} id='stack-1' />
            <DemoStack {...args} id='stack-2' />
          </div>
        </div>
      </Mosaic.Root>
    );
  },
  decorators: [FullscreenDecorator()],
};

export const Copy = {
  args: {
    SectionContent: SimpleContent,
    types: ['document'],
    className: 'w-[400px]',
  },
  render: ({ debug, ...args }: DemoStackProps & { debug: boolean }) => {
    return (
      <Mosaic.Root debug={debug}>
        <Mosaic.DragOverlay />
        <div className='flex grow justify-center p-4'>
          <div className='grid grid-cols-2 gap-4'>
            <DemoStack {...args} id='stack-1' />
            <DemoStack {...args} id='stack-2' operation='copy' count={0} />
          </div>
        </div>
      </Mosaic.Root>
    );
  },
  decorators: [FullscreenDecorator()],
};

export type DemoStackProps = StackProps & {
  types?: string[];
  count?: number;
  operation?: MosaicOperation;
};

const DemoStack = ({
  id = 'stack',
  SectionContent,
  types,
  count = 8,
  operation = 'transfer',
  className,
}: DemoStackProps) => {
  const [items, setItems] = useState<StackSectionItem[]>(() => {
    const generator = new TestObjectGenerator({ types });
    return generator.createObjects({ length: count });
  });

  const itemsRef = useRef(items);

  const handleOver = ({ active }: MosaicMoveEvent<number>) => {
    if (operation === 'reject') {
      return 'reject';
    }

    // TODO(wittjosiah): Items is stale here for some inexplicable reason, so ref helps.
    const exists = itemsRef.current.findIndex((item) => item.id === active.item.id) >= 0;

    if (!exists) {
      return operation;
    } else {
      return 'reject';
    }
  };

  const handleDrop = ({ operation, active, over }: MosaicDropEvent<number>) => {
    setItems((items) => {
      if (
        (active.path === Path.create(id, active.item.id) || active.path === id) &&
        (operation !== 'copy' || over.path === Path.create(id, over.item.id) || over.path === id)
      ) {
        items.splice(active.position!, 1);
      }

      if (over.path === Path.create(id, over.item.id)) {
        items.splice(over.position!, 0, active.item as StackSectionItem);
      } else if (over.path === id) {
        items.push(active.item as StackSectionItem);
      }

      const i = [...items];
      itemsRef.current = i;
      return i;
    });
  };

  const handleRemove = (path: string) => {
    setItems((items) => {
      const newItems = items.filter((item) => item.id !== Path.last(path));
      itemsRef.current = newItems;
      return newItems;
    });
  };

  return (
    <Stack
      id={id}
      className={className}
      SectionContent={SectionContent}
      items={items}
      onOver={handleOver}
      onDrop={handleDrop}
      onRemoveSection={handleRemove}
    />
  );
};
