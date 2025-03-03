//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useRef, useState } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme, withSignals } from '@dxos/storybook-utils';

import { ScrollContainer, type ScrollController } from './ScrollContainer';

const meta: Meta<typeof ScrollContainer> = {
  title: 'ui/react-ui-components/ScrollContainer',
  component: ScrollContainer,
  decorators: [withSignals, withTheme, withLayout({ fullscreen: true, classNames: 'justify-center' })],
  render: (args) => {
    const [lines, setLines] = useState<string[]>([]);
    const scroller = useRef<ScrollController>(null);
    useEffect(() => {
      const i = setInterval(() => {
        setLines((lines) => [...lines, `Line ${lines.length + 1}`]);
      }, 250);

      return () => clearInterval(i);
    }, []);

    return (
      <div className='flex flex-col w-96 overflow-hidden'>
        <Toolbar.Root>
          <Button onClick={() => scroller.current?.scrollToBottom()}>Scroll to bottom</Button>
          <div className='flex-1' />
          <div>{lines.length}</div>
        </Toolbar.Root>
        <ScrollContainer {...args} ref={scroller} classNames='grow'>
          {lines.map((line, index) => (
            <div key={index} className='p-2 bg-gray-100'>
              {line}
            </div>
          ))}
        </ScrollContainer>
      </div>
    );
  },
};

export default meta;

type Story = StoryObj<typeof ScrollContainer>;

export const Default: Story = {
  args: {},
};
