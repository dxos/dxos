//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import { faker } from '@dxos/random';

import { Layout } from '../../primitives';
import { withLayout, withTheme } from '../../testing';
import { Button } from '../Button';
import { Toolbar } from '../Toolbar';

import { ScrollContainer, type ScrollContainerRootProps, type ScrollController } from './ScrollContainer';

type StoryProps = ScrollContainerRootProps & { running?: boolean; initialLines?: number };

const DefaultStory = ({ initialLines = 0, running: runningProp, ...props }: StoryProps) => {
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(runningProp);
  const scroller = useRef<ScrollController>(null);
  useEffect(() => {
    setLines(Array.from({ length: initialLines }, () => faker.lorem.paragraph()));
  }, [initialLines]);
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
    <Layout.Main toolbar>
      <Toolbar.Root>
        <Button onClick={() => setRunning((running) => !running)}>{running ? 'Stop' : 'Start'}</Button>
        <Button onClick={() => scroller.current?.scrollToBottom()}>Scroll to bottom</Button>
        <Toolbar.Separator variant='gap' />
        <div className='px-1'>{lines.length}</div>
      </Toolbar.Root>
      <ScrollContainer.Root {...props} ref={scroller}>
        <ScrollContainer.Viewport>
          {lines.map((line, index) => (
            <div key={index} className='p-2 text-description'>
              {line}
            </div>
          ))}
        </ScrollContainer.Viewport>
        <ScrollContainer.ScrollDownButton />
      </ScrollContainer.Root>
    </Layout.Main>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/ScrollContainer',
  component: ScrollContainer.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[30rem]' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pin: true,
    fade: true,
    running: true,
  },
};

export const Large: Story = {
  args: {
    pin: true,
    fade: true,
    initialLines: 100,
  },
};
