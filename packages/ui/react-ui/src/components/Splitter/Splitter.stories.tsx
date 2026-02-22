//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Layout } from '../../primitives';
import { withLayout, withTheme } from '../../testing';
import { ScrollArea } from '../ScrollArea';
import { Toolbar } from '../Toolbar';

import { Splitter, type SplitterRootProps } from './Splitter';

const Panel = ({ label }: { label: string }) => {
  return (
    <Layout.Main toolbar>
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
    </Layout.Main>
  );
};

const DefaultStory = (props: SplitterRootProps) => {
  const [mode, setMode] = useState(props.mode ?? 'both');

  return (
    <div className='grid grid-rows-[min-content_1fr] block-full overflow-hidden'>
      <Toolbar.Root>
        <Toolbar.Button onClick={() => setMode('upper')}>A</Toolbar.Button>
        <Toolbar.Button onClick={() => setMode('both')}>A + B</Toolbar.Button>
        <Toolbar.Button onClick={() => setMode('lower')}>B</Toolbar.Button>
      </Toolbar.Root>
      <Splitter.Root mode={mode} ratio={props.ratio} classNames='divide-y divide-subduedSeparator'>
        <Splitter.Panel position='upper'>
          <Panel label='A' />
        </Splitter.Panel>
        <Splitter.Panel position='lower'>
          <Panel label='B' />
        </Splitter.Panel>
      </Splitter.Root>
    </div>
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
