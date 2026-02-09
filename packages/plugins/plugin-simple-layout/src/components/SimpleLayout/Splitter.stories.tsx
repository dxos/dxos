//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Splitter, type SplitterRootProps } from './Splitter';

const Panel = ({ label }: { label: string }) => {
  return (
    <div className='bs-full flex flex-col overflow-hidden p-1'>
      {label}
      <div className='flex-1 overflow-y-auto'>
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i}>
            {label}-{i}
          </div>
        ))}
      </div>
    </div>
  );
};

const DefaultStory = (props: SplitterRootProps) => {
  const [mode, setMode] = React.useState<'upper' | 'lower' | 'both'>(props.mode);

  return (
    <div className='grid grid-rows-[min-content_1fr] bs-full overflow-hidden'>
      <Toolbar.Root>
        <Toolbar.Button onClick={() => setMode('upper')}>A</Toolbar.Button>
        <Toolbar.Button onClick={() => setMode('both')}>A + B</Toolbar.Button>
        <Toolbar.Button onClick={() => setMode('lower')}>B</Toolbar.Button>
      </Toolbar.Root>
      <Splitter.Root mode={mode} upperRatio={props.upperRatio} classNames='divide-y divide-subduedSeparator'>
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
  title: 'components/Splitter',
  component: Splitter.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<SplitterRootProps>;

export const Default: Story = {
  args: {
    mode: 'both',
    upperRatio: 0.5,
  },
};
