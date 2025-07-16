//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import { faker } from '@dxos/random';
import { Button, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ScrollContainer, type ScrollController } from './ScrollContainer';

const meta: Meta<typeof ScrollContainer> = {
  title: 'ui/react-ui-components/ScrollContainer',
  component: ScrollContainer,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'justify-center' })],
  render: (args) => {
    const [lines, setLines] = useState<string[]>([]);
    const [running, setRunning] = useState(true);
    const scroller = useRef<ScrollController>(null);
    useEffect(() => {
      if (!running) {
        return;
      }

      const i = setInterval(() => {
        setLines((lines) => [...lines, faker.lorem.paragraph()]);
      }, 500);

      return () => {
        clearInterval(i);
      };
    }, [running]);

    return (
      <div className='flex flex-col w-96 overflow-hidden'>
        <Toolbar.Root>
          <Button onClick={() => setRunning((running) => !running)}>{running ? 'Stop' : 'Start'}</Button>
          <Button onClick={() => scroller.current?.scrollToBottom()}>Scroll to bottom</Button>
          <div className='flex-1' />
          <div>{lines.length}</div>
        </Toolbar.Root>
        <ScrollContainer fade {...args} ref={scroller}>
          {lines.map((line, index) => (
            <div key={index} className='p-2'>
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
