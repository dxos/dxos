//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { Button } from '@dxos/react-ui';
import { withLayout, withTheme, withSignals } from '@dxos/storybook-utils';

import { StatusLine } from './StatusLine';

const meta: Meta<typeof StatusLine> = {
  title: 'plugins/plugin-automation/StatusLine',
  component: StatusLine,
  decorators: [withSignals, withTheme, withLayout()],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof StatusLine>;

export const Default: Story = {
  args: {
    classNames: 'w-96 px-2',
    lines: Array.from({ length: 5 }, (_, i) => `${i}. ${faker.lorem.paragraph()}`),
    autoAdvance: 1_000,
  },
};

export const Demo: Story = {
  render: () => {
    const [lines, setLines] = useState<string[]>([]);

    return (
      <div className='flex flex-col w-96 gap-4'>
        <StatusLine lines={lines} autoAdvance advance={500} />
        <div>
          <Button onClick={() => setLines((lines) => [...lines, `${lines.length + 1}. ${faker.lorem.paragraph()}`])}>
            Add
          </Button>
        </div>
      </div>
    );
  },
};
