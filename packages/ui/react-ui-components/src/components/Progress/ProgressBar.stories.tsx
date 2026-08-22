//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { random } from '@dxos/random';
import { Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TextCrawl } from '../TextCrawl';
import { ProgressBar, type ProgressBarProps } from './ProgressBar';

const createItem = () => ({ id: `t-${Math.floor(Math.random() * 1000)}`, text: random.lorem.sentences(1) });

type TestItem = { id: string; text: string };

type StoryArgs = Partial<ProgressBarProps> & {
  items?: TestItem[];
};

const DefaultStory = ({ items, ...props }: StoryArgs) => {
  const [running, setRunning] = useState(false);
  const [nodes, setNodes] = useState<TestItem[]>(items ?? []);
  const lines = useMemo(() => nodes.map((item) => item.text), [nodes]);
  const [index, setIndex] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!running) {
      return;
    }

    let t: NodeJS.Timeout;
    const f = () => {
      const d = 1_000 + Math.random() * 5_000;
      t = setTimeout(() => {
        setNodes((nodes) => [...nodes, createItem()]);
        f();
      }, d);
    };

    f();
    return () => clearTimeout(t);
  }, [running]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={() => setRunning(true)}>Start</Toolbar.Button>
          <Toolbar.Button onClick={() => setRunning(false)}>Stop</Toolbar.Button>
          <Toolbar.Button onClick={() => setNodes((nodes) => [...nodes, createItem()])}>Add</Toolbar.Button>
          <Toolbar.Button onClick={() => setNodes([...(items ?? [])])}>Reset</Toolbar.Button>
          <Toolbar.Button onClick={() => setNodes([])}>Clear</Toolbar.Button>
          <div className='flex-1' />
          <div className='p-2 text-subdued'>{nodes.length}</div>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content></Panel.Content>
      <Panel.Statusbar asChild>
        <div>
          <ProgressBar
            state={{
              phases: nodes,
              phase: nodes.length - 1,
              status: running ? 'running' : 'done',
            }}
            selected={index}
            onSelect={(node) => setIndex((index) => (index === node.index ? undefined : node.index))}
            {...props}
          />
          <TextCrawl lines={lines} index={index} autoAdvance classNames='ps-4 text-sm text-subdued' />
        </div>
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-components/ProgressBar',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: Array.from({ length: 3 }).map(() => createItem()),
  },
};
