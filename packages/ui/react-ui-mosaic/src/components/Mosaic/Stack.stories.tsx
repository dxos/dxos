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

import { TestItem } from '../../testing';
import { Mosaic } from '../Mosaic';

import { Stack, VirtualStack } from './Stack';

faker.seed(999);

// Create test items factory (deferred to render time).
const createTestItems = () =>
  Array.from({ length: 100 }, () =>
    Obj.make(TestItem, {
      name: faker.lorem.sentence(3),
      description: faker.lorem.paragraph(),
    }),
  );

const meta: Meta<typeof Stack> = {
  title: 'ui/react-ui-mosaic/Stack',
  component: Stack,
  decorators: [withLayout({ layout: 'column' }), withTheme],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    axis: 'vertical',
    className: 'pli-3',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (props) => {
    const viewportRef = useRef<HTMLElement | null>(null);
    // Create items at render time to avoid Storybook serialization issues with ECHO objects.
    const items = useMemo(() => createTestItems(), []);
    return (
      <>
        <Toolbar.Root>
          <div className='flex grow justify-center'>Items: {items.length}</div>
        </Toolbar.Root>
        <Mosaic.Root asChild>
          <Mosaic.Container asChild axis='vertical' autoScroll={viewportRef.current} eventHandler={{ id: 'test' }}>
            <Mosaic.Viewport options={{ overflow: { y: 'scroll' } }} viewportRef={viewportRef}>
              <Stack {...props} items={items} />
            </Mosaic.Viewport>
          </Mosaic.Container>
        </Mosaic.Root>
      </>
    );
  },
};

export const Virtual: Story = {
  render: (props) => {
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const [info, setInfo] = useState<any>(null);
    // Create items at render time to avoid Storybook serialization issues with ECHO objects.
    const items = useMemo(() => createTestItems(), []);
    return (
      <>
        <Toolbar.Root>
          <div className='flex grow justify-center'>{JSON.stringify(info)}</div>
        </Toolbar.Root>
        <Mosaic.Root asChild>
          <Mosaic.Container asChild axis='vertical' autoScroll={viewportRef.current} eventHandler={{ id: 'test' }}>
            <Mosaic.Viewport options={{ overflow: { y: 'scroll' } }} viewportRef={viewportRef}>
              <VirtualStack
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
        </Mosaic.Root>
      </>
    );
  },
};
