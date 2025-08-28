//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { useEffect } from '@preact-signals/safe-react/react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { faker } from '@dxos/random';
import { Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { Flex } from '../Flex';
import { StatusRoll } from '../StatusRoll';

import { Progress, type ProgressProps } from './Progress';

// import { faker } from '@dxos/random';
// import { DataType } from '@dxos/schema';
// import { type ValueGenerator, createGenerator } from '@dxos/schema/testing';
// faker.seed(1);
// const generator = faker as any as ValueGenerator;
// const objectGenerator = createGenerator(generator, DataType.Organization, { force: true });

const createItem = () => ({ id: `t-${Math.floor(Math.random() * 1000)}`, text: faker.lorem.sentences(1) });

type TestItem = { id: string; text: string };

type StoryProps = Partial<ProgressProps> & {
  items?: TestItem[];
};

const DefaultStory = ({ items, ...props }: StoryProps) => {
  const [running, setRunning] = useState(false);
  const [nodes, setNodes] = useState<TestItem[]>(items ?? []);
  const lines = useMemo(() => nodes.map((item) => item.text), [nodes]);
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
        <Progress nodes={nodes} active={!!running} {...props} />
        <StatusRoll lines={lines} autoAdvance classNames='pis-4 text-sm text-subdued' />
      </Flex>
    </Flex>
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-components/Progress',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: Array.from({ length: 3 }).map(() => createItem()),
    width: 32,
    radius: 5.5,
  },
};
