//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { random } from '@dxos/random';
import { Dnd, type DndContainerHandler } from '@dxos/react-ui-dnd';
import { Next } from '@dxos/react-ui/next';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { arrayMove } from '@dxos/util';

import { useContainerDebug } from '../../hooks/index.ts';
import { DefaultStackTile, TestItem } from '../../testing/index.ts';
import { Focus } from '../Focus/index.ts';
import { Mosaic, MosaicStackProps } from './Mosaic.ts';
import { MosaicStack } from './Stack.tsx';

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
      <Next.Panel.Root>
        <Next.Panel.Header>
          <Next.Toolbar.Root>
            <Next.Toolbar.Text>Items: {items.length}</Next.Toolbar.Text>
          </Next.Toolbar.Root>
        </Next.Panel.Header>
        <Next.Panel.Body asChild>
          <Focus.Group asChild>
            <Mosaic.Container
              asChild
              orientation='vertical'
              autoScroll={viewport}
              eventHandler={eventHandler}
              debug={debugHandler}
              placeholderDebug={props.debug}
            >
              <Next.ScrollArea.Root orientation='vertical'>
                <Next.ScrollArea.Viewport ref={setViewport}>
                  <Mosaic.Stack {...props} items={items} />
                </Next.ScrollArea.Viewport>
              </Next.ScrollArea.Root>
            </Mosaic.Container>
          </Focus.Group>
        </Next.Panel.Body>
        {props.debug && (
          <Next.Panel.Footer classNames='h-[40dvh]'>
            <DebugInfo />
          </Next.Panel.Footer>
        )}
      </Next.Panel.Root>
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
      <Next.Panel.Root>
        <Next.Panel.Header>
          <Next.Toolbar.Root>
            <div className='flex grow justify-center'>{JSON.stringify(info)}</div>
          </Next.Toolbar.Root>
        </Next.Panel.Header>
        <Next.Panel.Body asChild>
          <Mosaic.Container
            asChild
            orientation='vertical'
            autoScroll={viewport}
            eventHandler={eventHandler}
            debug={debugHandler}
            placeholderDebug={props.debug}
          >
            <Next.ScrollArea.Root orientation='vertical'>
              <Next.ScrollArea.Viewport ref={setViewport}>
                <Mosaic.VirtualStack
                  {...props}
                  items={items}
                  getScrollElement={() => viewport}
                  estimateSize={() => 40}
                  onChange={(virtualizer) => {
                    setInfo({ range: virtualizer.range });
                  }}
                />
              </Next.ScrollArea.Viewport>
            </Next.ScrollArea.Root>
          </Mosaic.Container>
        </Next.Panel.Body>
        {props.debug && (
          <Next.Panel.Footer classNames='h-[40dvh]'>
            <DebugInfo />
          </Next.Panel.Footer>
        )}
      </Next.Panel.Root>
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
