//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { random } from '@dxos/random';
import { Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Dnd, type DndContainerHandler } from '@dxos/react-ui-dnd';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { arrayMove } from '@dxos/util';

import { useContainerDebug } from '../../hooks';
import { DefaultStackTile, TestItem } from '../../testing';
import { Focus } from '../Focus';
import { Mosaic, MosaicStackProps } from './Mosaic';
import { MosaicStack } from './Stack';

random.seed(999);

const NUM_ITEMS = 50;

// Create test items factory (deferred to render time).
const createTestItems = (n: number) =>
  Array.from({ length: n }, () =>
    Obj.make(TestItem, {
      name: random.lorem.sentence(3),
      description: random.lorem.paragraph(),
    }),
  );

// Stateful items plus a same-container reorder handler so the stories actually apply drops
// (the container is headless — reordering is the consumer's responsibility).
const useReorderableStack = () => {
  // Create items at render time to avoid Storybook serialization issues with ECHO objects.
  const [items, setItems] = useState(() => createTestItems(NUM_ITEMS));
  const eventHandler = useMemo<DndContainerHandler<Obj.Any>>(
    () => ({
      id: 'test',
      canDrop: () => true,
      onDrop: ({ source, target }) => {
        const to =
          (target?.type === 'tile' || target?.type === 'placeholder') && typeof target.location === 'number'
            ? Math.floor(target.location)
            : undefined;
        if (to === undefined || to < 0) {
          return;
        }
        setItems((prev) => {
          const from = prev.findIndex((item) => item.id === source.id);
          if (from === -1) {
            return prev;
          }
          const next = prev.slice();
          arrayMove(next, from, to);
          return next;
        });
      },
    }),
    [],
  );

  return { items, eventHandler };
};

const DefaultStackStory = (props: MosaicStackProps<Obj.Any>) => {
  const { items, eventHandler } = useReorderableStack();
  const [DebugInfo, debugHandler] = useContainerDebug(props.debug);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  return (
    <Dnd.Root>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Toolbar.Text>Items: {items.length}</Toolbar.Text>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Focus.Group asChild>
            <Mosaic.Container
              asChild
              orientation='vertical'
              autoScroll={viewport}
              eventHandler={eventHandler}
              debug={debugHandler}
              placeholderDebug={props.debug}
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
    </Dnd.Root>
  );
};

const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {
  const { items, eventHandler } = useReorderableStack();
  const [info, setInfo] = useState<any>(null);
  const [DebugInfo, debugHandler] = useContainerDebug(props.debug);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  return (
    <Dnd.Root>
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
            eventHandler={eventHandler}
            debug={debugHandler}
            placeholderDebug={props.debug}
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
    </Dnd.Root>
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
