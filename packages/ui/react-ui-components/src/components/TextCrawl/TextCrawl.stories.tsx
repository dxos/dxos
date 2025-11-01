//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { TextCrawl, sizes } from './TextCrawl';

faker.seed(1234);

const meta = {
  title: 'ui/react-ui-components/TextCrawl',
  component: TextCrawl,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof TextCrawl>;

export default meta;

const createLines = () => {
  const length = faker.number.int({ min: 1, max: 10 });
  return Array.from({ length }, (_, i) => `[${i + 1}/${length}] ${faker.lorem.paragraph()}`);
};

type Story = StoryObj<typeof TextCrawl>;

export const Default: Story = {
  args: {
    classNames: 'w-96 px-2',
    lines: createLines(),
    autoAdvance: true,
  },
};

export const Cyclic: Story = {
  args: {
    classNames: 'w-96 px-2',
    lines: createLines(),
    autoAdvance: true,
    cyclic: true,
  },
};

export const Reset: Story = {
  render: (args) => {
    const [lines, setLines] = useState<string[]>(createLines());
    return (
      <div className='flex flex-col gap-4'>
        <Toolbar.Root>
          <Toolbar.Button onClick={() => setLines(createLines())}>Reset</Toolbar.Button>
        </Toolbar.Root>
        <TextCrawl {...args} lines={lines} autoAdvance />
      </div>
    );
  },
  args: {
    classNames: 'w-96 px-2',
    autoAdvance: true,
  },
};

export const Demo: Story = {
  render: () => {
    const [lines, setLines] = useState<string[]>(createLines());
    return (
      <div className='flex flex-col is-[20rem] gap-4 p-1'>
        <Toolbar.Root>
          <Toolbar.Button onClick={() => setLines(createLines())}>Add</Toolbar.Button>
          <Toolbar.Button onClick={() => setLines([])}>Reset</Toolbar.Button>
        </Toolbar.Root>
        <TextCrawl classNames='border-b border-separator' lines={lines} autoAdvance />
      </div>
    );
  },
};

const digits = '0123456789'.split('');

export const Numbers: Story = {
  render: () => {
    const n = 5;
    const [count, setCount] = useState(123);
    const str = String(count).padStart(n, '0');
    useEffect(() => {
      // TODO(burdon): Use animation frame.
      const i = setInterval(() => setCount((count) => count + 1), 1_000);
      return () => clearInterval(i);
    }, []);

    return (
      <div className='flex flex-col gap-4'>
        {sizes.map((size) => (
          <div className='flex' key={size}>
            {Array.from({ length: n }).map((_, i) => (
              <TextCrawl
                key={i}
                classNames={['font-mono', i === n - 1 && 'text-red-500']}
                size={size}
                lines={digits}
                index={digits.findIndex((d) => d === str[i])}
                transition={100}
                cyclic
              />
            ))}
          </div>
        ))}
      </div>
    );
  },
};
