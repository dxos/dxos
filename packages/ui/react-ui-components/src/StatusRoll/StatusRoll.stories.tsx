//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { Button } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { StatusRoll, sizes } from './StatusRoll';

const meta: Meta<typeof StatusRoll> = {
  title: 'ui/react-ui-components/StatusRoll',
  component: StatusRoll,
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof StatusRoll>;

export const Default: Story = {
  args: {
    classNames: 'w-96 px-2',
    lines: Array.from({ length: 5 }, (_, i) => `${i}. ${faker.lorem.paragraph()}`),
    autoAdvance: true,
  },
};

export const Demo: Story = {
  render: () => {
    const [lines, setLines] = useState<string[]>([]);

    return (
      <div className='flex flex-col w-96 gap-4'>
        <StatusRoll classNames='px-2 border border-separator rounded-md' lines={lines} autoAdvance duration={1_000} />
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
      const i = setInterval(() => setCount((count) => count + 1), 1_000);
      return () => clearInterval(i);
    }, []);

    return (
      <div className='flex flex-col gap-4'>
        {sizes.map((size) => (
          <div className='flex' key={size}>
            {Array.from({ length: n }).map((_, i) => (
              <StatusRoll
                key={i}
                classNames={['font-mono', i === n - 1 && 'text-red-500']}
                size={size}
                lines={digits}
                index={digits.findIndex((d) => d === str[i])}
                cyclic
              />
            ))}
          </div>
        ))}
      </div>
    );
  },
};
