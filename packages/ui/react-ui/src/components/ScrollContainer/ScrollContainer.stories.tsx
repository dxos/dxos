//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import { faker } from '@dxos/random';

import { withLayout, withTheme } from '../../testing';
import { Button } from '../Button';
import { Toolbar } from '../Toolbar';

import { ScrollContainer, type ScrollContainerRootProps, type ScrollController } from './ScrollContainer';

const DefaultStory = (props: ScrollContainerRootProps) => {
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

    return () => clearInterval(i);
  }, [running]);

  return (
    <div className='flex flex-col bs-full overflow-hidden'>
      <Toolbar.Root>
        <Button onClick={() => setRunning((running) => !running)}>{running ? 'Stop' : 'Start'}</Button>
        <Button onClick={() => scroller.current?.scrollToBottom()}>Scroll to bottom</Button>
        <div className='flex-1' />
        <div>{lines.length}</div>
      </Toolbar.Root>
      <ScrollContainer.Root {...props} ref={scroller}>
        <ScrollContainer.Viewport>
          {lines.map((line, index) => (
            <div key={index} className='p-2'>
              {line}
            </div>
          ))}
        </ScrollContainer.Viewport>
        <ScrollContainer.ScrollDownButton />
      </ScrollContainer.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/ScrollContainer',
  component: ScrollContainer.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ container: 'column', classNames: 'is-[30rem]' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pin: true,
    fade: true,
  },
};
