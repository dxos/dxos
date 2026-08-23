//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { random } from '@dxos/random';

import { withTheme } from '../../testing';
import { Toolbar } from '../Toolbar';
import { textCrawlSizes } from './sizes';
import { TextCrawl } from './TextCrawl';

random.seed(1234);

const meta = {
  title: 'ui/react-ui-core/components/TextCrawl',
  component: TextCrawl,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof TextCrawl>;

export default meta;

const createLines = () => {
  const length = random.number.int({ min: 1, max: 10 });
  return Array.from({ length }, (_, i) => `[${i + 1}/${length}] ${random.lorem.paragraph()}`);
};

type Story = StoryObj<typeof TextCrawl>;

export const Default: Story = {
  args: {
    classNames: 'w-[20rem] px-1',
    lines: createLines(),
    autoAdvance: true,
  },
};

export const Cyclic: Story = {
  args: {
    classNames: 'w-[20rem] px-1',
    lines: createLines(),
    autoAdvance: true,
    cyclic: true,
  },
};

export const Controlled: Story = {
  render: () => {
    const [lines, setLines] = useState<string[]>(createLines());
    return (
      <div className='flex flex-col w-[20rem] gap-4'>
        <Toolbar.Root>
          <Toolbar.Button
            onClick={() =>
              setLines((lines) => {
                return [...lines, `[${lines.length + 1}/${lines.length + 1}] ${random.lorem.paragraph()}`];
              })
            }
          >
            Add
          </Toolbar.Button>
          <Toolbar.Button onClick={() => setLines(createLines())}>Generate</Toolbar.Button>
          <Toolbar.Button onClick={() => setLines([])}>Clear</Toolbar.Button>
        </Toolbar.Root>
        <TextCrawl lines={lines} autoAdvance greedy />
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
      const i = setInterval(() => setCount((count) => count + 1), 1_000);
      return () => clearInterval(i);
    }, []);

    return (
      <div className='flex flex-col gap-4'>
        {textCrawlSizes.map((size) => (
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
