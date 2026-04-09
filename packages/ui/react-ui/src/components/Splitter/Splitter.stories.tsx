//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ComponentPropsWithoutRef, forwardRef, useState } from 'react';

import { Panel } from '../../primitives';
import { withLayout, withTheme } from '../../testing';
import { ScrollArea } from '../ScrollArea';
import { Toolbar } from '../Toolbar';
import { Splitter, type SplitterRootProps } from './Splitter';

const PanelContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'> & { label: string }>(
  ({ label, ...props }, ref) => (
    <div ref={ref} {...props}>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>{label}</Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport>
              {Array.from({ length: 100 }).map((_, i) => (
                <div key={i} className='p-1'>
                  {label}-{i}
                </div>
              ))}
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      </Panel.Root>
    </div>
  ),
);

const DefaultStory = (props: SplitterRootProps) => {
  const [mode, setMode] = useState(props.mode ?? 'both');

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={() => setMode('upper')}>A</Toolbar.Button>
          <Toolbar.Button onClick={() => setMode('both')}>A + B</Toolbar.Button>
          <Toolbar.Button onClick={() => setMode('lower')}>B</Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Splitter.Root mode={mode} ratio={props.ratio}>
          <Splitter.Panel asChild position='upper'>
            <PanelContent label='A' />
          </Splitter.Panel>
          <Splitter.Panel asChild position='lower'>
            <PanelContent label='B' />
          </Splitter.Panel>
        </Splitter.Root>
      </Panel.Content>
    </Panel.Root>
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
