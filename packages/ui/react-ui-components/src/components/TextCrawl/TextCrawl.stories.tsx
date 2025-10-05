//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React, { useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { Button } from '@dxos/react-ui';

import { TextCrawl, sizes } from './TextCrawl';

const meta = {
  title: 'ui/react-ui-components/TextCrawl',
  component: TextCrawl,
  decorators: [withTheme],

  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof TextCrawl>;

export default meta;

type Story = StoryObj<typeof TextCrawl>;

export const Default: Story = {
  args: {
    classNames: 'w-96 px-2',
    lines: Array.from({ length: 5 }, (_, i) => `${i}. ${faker.lorem.paragraph()}`),
    autoAdvance: true,
  },
};

export const Cyclic: Story = {
  args: {
    classNames: 'w-96 px-2',
    lines: Array.from({ length: 5 }, (_, i) => `${i}. ${faker.lorem.paragraph()}`),
    autoAdvance: true,
    cyclic: true,
  },
};

export const Demo: Story = {
  render: () => {
    const [lines, setLines] = useState<string[]>([]);

    return (
      <div className='flex flex-col w-96 gap-4'>
        <TextCrawl classNames='px-2 border border-separator rounded-md' lines={lines} autoAdvance />
        <div>
          <Button onClick={() => setLines((lines) => [...lines, `${lines.length + 1}. ${faker.lorem.paragraph()}`])}>
            Add
          </Button>
        </div>
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
