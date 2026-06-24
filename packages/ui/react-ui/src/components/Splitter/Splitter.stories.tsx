//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ComponentPropsWithoutRef, forwardRef, useState } from 'react';

import { withLayout, withTheme } from '../../testing';
import { Panel } from '../Panel';
import { ScrollArea } from '../ScrollArea';
import { Toolbar } from '../Toolbar';
import { Splitter, type SplitterMode, type SplitterRootProps } from './Splitter';

const PanelContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'> & { label: string }>(
  ({ label, ...props }, forwardedRef) => (
    <Panel.Root {...props} ref={forwardedRef}>
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
  ),
);

const Panes = () => (
  <>
    <Splitter.Panel position='start'>
      <PanelContent label='A' />
    </Splitter.Panel>
    <Splitter.Handle />
    <Splitter.Panel position='end'>
      <PanelContent label='B' />
    </Splitter.Panel>
  </>
);

// Renders the splitter with no surrounding chrome (Panel.Root keeps the height chain without a toolbar).
const BasicStory = (args: SplitterRootProps) => (
  <Panel.Root>
    <Panel.Content asChild>
      <Splitter.Root {...args}>
        <Panes />
      </Splitter.Root>
    </Panel.Content>
  </Panel.Root>
);

// Toolbar drives the animated collapse via `mode`.
const ToolbarStory = (args: SplitterRootProps) => {
  const [mode, setMode] = useState<SplitterMode>(args.mode ?? 'split');
  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={() => setMode('start')}>A</Toolbar.Button>
          <Toolbar.Button onClick={() => setMode('split')}>A+B</Toolbar.Button>
          <Toolbar.Button onClick={() => setMode('end')}>B</Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Splitter.Root {...args} mode={mode}>
          <Panes />
        </Splitter.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

const meta: Meta<SplitterRootProps> = {
  title: 'ui/react-ui-core/components/Splitter',
  component: Splitter.Root,
  render: BasicStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<SplitterRootProps>;

export const Vertical: Story = {
  args: {
    resizable: true,
    defaultSize: 12,
    minSize: 6,
  },
};

export const VerticalAnimated: Story = {
  render: ToolbarStory,
  args: {
    transition: 250,
    defaultSize: 12,
  },
};

export const HorizontalStart: Story = {
  args: {
    orientation: 'horizontal',
    anchor: 'start',
    resizable: true,
    defaultSize: 20,
    minSize: 6,
  },
};

export const HorizontalEnd: Story = {
  args: {
    orientation: 'horizontal',
    anchor: 'end',
    resizable: true,
    defaultSize: 20,
    minSize: 6,
  },
};

export const HorizontalAnimated: Story = {
  render: ToolbarStory,
  args: {
    orientation: 'horizontal',
    transition: 250,
  },
};
