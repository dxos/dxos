//
// Copyright 2025 DXOS.org
//

import { useEffect } from '@preact-signals/safe-react/react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { faker } from '@dxos/random';
import { Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { Flex } from '../Flex';
import { TextCrawl } from '../TextCrawl';

import { ProgressBar, type ProgressBarProps } from './ProgressBar';

const createItem = () => ({ id: `t-${Math.floor(Math.random() * 1000)}`, text: faker.lorem.sentences(1) });

type TestItem = { id: string; text: string };

type StoryProps = Partial<ProgressBarProps> & {
  items?: TestItem[];
};

const DefaultStory = ({ items, ...props }: StoryProps) => {
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
    <Flex column classNames='w-[400px] gap-8 overflow-hidden'>
      <Toolbar.Root>
        <Toolbar.Button onClick={() => setRunning(true)}>Start</Toolbar.Button>
        <Toolbar.Button onClick={() => setRunning(false)}>Stop</Toolbar.Button>
        <Toolbar.Button onClick={() => setNodes((nodes) => [...nodes, createItem()])}>Add</Toolbar.Button>
        <Toolbar.Button onClick={() => setNodes([...(items ?? [])])}>Reset</Toolbar.Button>
        <Toolbar.Button onClick={() => setNodes([])}>Clear</Toolbar.Button>
        <div className='flex-1' />
        <div className='p-2 text-subdued'>{nodes.length}</div>
      </Toolbar.Root>

      <Flex column classNames='gap-1'>
        <ProgressBar
          nodes={nodes}
          index={index}
          active={!!running}
          onSelect={(node) => setIndex((index) => (index === node.index ? undefined : node.index))}
          {...props}
        />
        <TextCrawl lines={lines} index={index} autoAdvance classNames='pis-4 text-sm text-subdued' />
      </Flex>
    </Flex>
  );
};

const meta = {
  title: 'ui/react-ui-components/ProgressBar',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: Array.from({ length: 3 }).map(() => createItem()),
  },
};
