//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { useContainerDebug } from '../../hooks';
import { DefaultStackTile, TestItem } from '../../testing';

import { Mosaic, MosaicStackProps } from './Mosaic';
import { MosaicStack } from './Stack';
import { Focus } from '../Focus';

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

const DefaultStackStory = (props: MosaicStackProps<Obj.Any>) => {
  // Create items at render time to avoid Storybook serialization issues with ECHO objects.
  const items = useMemo(() => createTestItems(NUM_ITEMS), []);
  const [DebugInfo, debugHandler] = useContainerDebug(props.debug);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  return (
    <Mosaic.Root classNames='dx-container' debug={props.debug}>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <div className='flex grow justify-center'>Items: {items.length}</div>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Focus.Group asChild>
            <Mosaic.Container
              asChild
              orientation='vertical'
              autoScroll={viewport}
              eventHandler={{ id: 'test', canDrop: () => true }}
              debug={debugHandler}
            >
              <ScrollArea.Root orientation='vertical'>
                <ScrollArea.Viewport ref={setViewport}>
                  <Mosaic.Stack {...props} items={items} />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Mosaic.Container>
          </Focus.Group>
        </Panel.Content>
        {props.debug && (
          <Panel.Statusbar className='h-[40dvh]'>
            <DebugInfo />
          </Panel.Statusbar>
        )}
      </Panel.Root>
    </Mosaic.Root>
  );
};

const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {
  // Create items at render time to avoid Storybook serialization issues with ECHO objects.
  const items = useMemo(() => createTestItems(NUM_ITEMS), []);
  const [info, setInfo] = useState<any>(null);
  const [DebugInfo, debugHandler] = useContainerDebug(props.debug);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  return (
    <Mosaic.Root classNames='dx-container' debug={props.debug}>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <div className='flex grow justify-center'>{JSON.stringify(info)}</div>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Mosaic.Container
            asChild
            orientation='vertical'
            autoScroll={viewport}
            eventHandler={{ id: 'test', canDrop: () => true }}
            debug={debugHandler}
          >
            <ScrollArea.Root orientation='vertical'>
              <ScrollArea.Viewport ref={setViewport}>
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
        </Panel.Content>
        {props.debug && (
          <Panel.Statusbar className='h-[40dvh]'>
            <DebugInfo />
          </Panel.Statusbar>
        )}
      </Panel.Root>
    </Mosaic.Root>
  );
};

const meta: Meta<typeof MosaicStack<Obj.Any>> = {
  title: 'ui/react-ui-mosaic/Stack',
  component: MosaicStack,
  decorators: [withLayout({ layout: 'column' }), withTheme()],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    orientation: 'vertical',
    getId: (item) => item.id,
    Tile: DefaultStackTile,
    draggable: false,
    debug: false,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStackStory,
};

export const DefaultDraggable: Story = {
  render: DefaultStackStory,
  args: {
    draggable: true,
  },
};

export const DefaultDebug: Story = {
  render: DefaultStackStory,
  args: {
    debug: true,
    draggable: true,
  },
};

export const Virtual: Story = {
  render: VirtualStackStory,
};

export const VirtualDraggable: Story = {
  render: VirtualStackStory,
  args: {
    draggable: true,
  },
};

export const VirtualDebug = {
  render: VirtualStackStory,
  args: {
    debug: true,
  },
};
