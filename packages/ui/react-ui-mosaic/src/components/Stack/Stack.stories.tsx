//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { ScrollArea, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { useContainerDebug } from '../../hooks';
import { DefaultStackTile, TestItem } from '../../testing';
import { Mosaic } from '../Mosaic';

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
  decorators: [withLayout({ layout: 'column' }), withTheme()],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    orientation: 'vertical',
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
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    return (
      <Mosaic.Root debug={props.debug} classNames='bs-full grid grid-rows-[min-content_1fr_min-content]'>
        <Toolbar.Root classNames='border-be border-separator'>
          <div className='flex grow justify-center'>Items: {items.length}</div>
        </Toolbar.Root>
        <Mosaic.Container
          asChild
          orientation='vertical'
          autoScroll={viewport}
          eventHandler={{ id: 'test', canDrop: () => true }}
          debug={debugHandler}
        >
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport classNames='p-2' ref={setViewport}>
              <Mosaic.Stack {...props} items={items} />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
        <DebugInfo classNames='border-bs border-separator' />
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
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    return (
      <Mosaic.Root debug={props.debug} classNames='grid grid-rows-[min-content_1fr_min-content]'>
        <Toolbar.Root>
          <div className='flex grow justify-center'>{JSON.stringify(info)}</div>
        </Toolbar.Root>
        <Mosaic.Container
          asChild
          orientation='vertical'
          autoScroll={viewport}
          eventHandler={{ id: 'test', canDrop: () => true }}
          debug={debugHandler}
        >
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport classNames='p-2' ref={setViewport}>
              <Mosaic.VirtualStack
              {...props}
              items={items}
              getScrollElement={() => viewport}
              estimateSize={() => 40}
              onChange={(virtualizer) => {
                setInfo({ range: virtualizer.range });
              }}
            />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
        <DebugInfo />
      </Mosaic.Root>
    );
  },
};
