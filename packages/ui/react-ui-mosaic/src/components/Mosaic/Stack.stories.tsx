//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TestItem } from '../../testing';
import { Mosaic } from '../Mosaic';

import { Stack, VirtualStack } from './Stack';

faker.seed(999);

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
    items: Array.from({ length: 100 }, () =>
      Obj.make(TestItem, {
        name: faker.lorem.sentence(3),
        description: faker.lorem.paragraph(),
      }),
    ),
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (props) => {
    const viewportRef = useRef<HTMLElement | null>(null);
    return (
      <>
        <Toolbar.Root>
          <div className='flex grow justify-center'>Items: {props.items?.length}</div>
        </Toolbar.Root>
        <Mosaic.Root asChild>
          <Mosaic.Container asChild axis='vertical' autoScroll={viewportRef.current} eventHandler={{ id: 'test' }}>
            <Mosaic.Viewport options={{ overflow: { y: 'scroll' } }} viewportRef={viewportRef}>
              <Stack {...props} />
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
