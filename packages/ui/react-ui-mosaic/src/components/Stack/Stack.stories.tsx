//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';
import { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { DefaultStackTile, TestItem } from '../../testing';
import { Mosaic, useContainerDebug } from '../Mosaic';

import { Stack } from './Stack';

faker.seed(999);

const NUM_ITEMS = 50;

// Create test items factory (deferred to render time).
const createTestItems = (n: number) =>
  Array.from({ length: n }, () =>
    Obj.make(TestItem, {
      name: faker.lorem.sentence(3),
      description: faker.lorem.paragraph(),
    }),
  );

const meta: Meta<typeof Stack<Obj.Any>> = {
  title: 'ui/react-ui-mosaic/Stack',
  component: Stack,
  decorators: [withLayout({ layout: 'column' }), withTheme],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    axis: 'vertical',
    className: 'pli-3',
    getId: (item) => item.id,
    Tile: DefaultStackTile,
    // debug: true,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (props) => {
    // Create items at render time to avoid Storybook serialization issues with ECHO objects.
    const items = useMemo(() => createTestItems(NUM_ITEMS), []);
    const [DebugInfo, debugHandler] = useContainerDebug(props.debug);
    const viewportRef = useRef<HTMLElement | null>(null);
    return (
      <Mosaic.Root debug={props.debug} classNames='bs-full grid grid-rows-[min-content_1fr_min-content]'>
        <Toolbar.Root classNames='border-b border-separator'>
          <div className='flex grow justify-center'>Items: {items.length}</div>
        </Toolbar.Root>
        <Mosaic.Container
          asChild
          axis='vertical'
          autoScroll={viewportRef.current}
          eventHandler={{ id: 'test', canDrop: () => true }}
          debug={debugHandler}
        >
          <Mosaic.Viewport axis='vertical' viewportRef={viewportRef}>
            <Mosaic.Stack {...props} items={items} />
          </Mosaic.Viewport>
        </Mosaic.Container>
        <DebugInfo classNames='border-t border-separator' />
      </Mosaic.Root>
    );
  },
};

export const Virtual: Story = {
  render: (props) => {
    // Create items at render time to avoid Storybook serialization issues with ECHO objects.
    const items = useMemo(() => createTestItems(NUM_ITEMS), []);
    const [info, setInfo] = useState<any>(null);
    const [DebugInfo, debugHandler] = useContainerDebug(props.debug);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    return (
      <Mosaic.Root debug={props.debug} classNames='grid grid-rows-[min-content_1fr_min-content]'>
        <Toolbar.Root>
          <div className='flex grow justify-center'>{JSON.stringify(info)}</div>
        </Toolbar.Root>
        <Mosaic.Container
          asChild
          axis='vertical'
          autoScroll={viewportRef.current}
          eventHandler={{ id: 'test', canDrop: () => true }}
          debug={debugHandler}
        >
          <Mosaic.Viewport axis='vertical' viewportRef={viewportRef}>
            <Mosaic.VirtualStack
              {...props}
              items={items}
              getScrollElement={() => viewportRef.current}
              estimateSize={() => 40}
              onChange={(virtualizer) => {
                setInfo({ range: virtualizer.range });
              }}
            />
          </Mosaic.Viewport>
        </Mosaic.Container>
        <DebugInfo />
      </Mosaic.Root>
    );
  },
};
