//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ComponentPropsWithoutRef, forwardRef, useState } from 'react';

import { Container } from '../../primitives';
import { withLayout, withTheme } from '../../testing';
import { ScrollArea } from '../ScrollArea';
import { Toolbar } from '../Toolbar';

import { Splitter, type SplitterRootProps } from './Splitter';

const Panel = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'> & { label: string }>(
  ({ label, ...props }, ref) => (
    <div ref={ref} {...props}>
      <Container.Main toolbar>
        <Toolbar.Root>{label}</Toolbar.Root>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            {Array.from({ length: 100 }).map((_, i) => (
              <div key={i} className='p-1'>
                {label}-{i}
              </div>
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Container.Main>
    </div>
  ),
);

const DefaultStory = (props: SplitterRootProps) => {
  const [mode, setMode] = useState(props.mode ?? 'both');

  return (
    <Container.Main toolbar>
      <Toolbar.Root>
        <Toolbar.Button onClick={() => setMode('upper')}>A</Toolbar.Button>
        <Toolbar.Button onClick={() => setMode('both')}>A + B</Toolbar.Button>
        <Toolbar.Button onClick={() => setMode('lower')}>B</Toolbar.Button>
      </Toolbar.Root>
      <Splitter.Root mode={mode} ratio={props.ratio}>
        <Splitter.Panel asChild position='upper'>
          <Panel label='A' />
        </Splitter.Panel>
        <Splitter.Panel asChild position='lower'>
          <Panel label='B' />
        </Splitter.Panel>
      </Splitter.Root>
    </Container.Main>
  );
};

const meta: Meta<SplitterRootProps> = {
  title: 'ui/react-ui-core/components/Splitter',
  component: Splitter.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<SplitterRootProps>;

export const Default: Story = {
  args: {
    mode: 'both',
    ratio: 0.5,
  },
};
