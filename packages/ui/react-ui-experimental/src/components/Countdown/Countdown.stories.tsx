//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Next } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Countdown, type CountdownProps } from './Countdown.tsx';

const DefaultStory = (props: CountdownProps) => {
  // Remounting the leader replays it; the key is the only state a replay needs.
  const [take, setTake] = useState(0);
  const [done, setDone] = useState(false);

  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Button
            onClick={() => {
              setDone(false);
              setTake((take) => take + 1);
            }}
          >
            Replay
          </Next.Button>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body classNames='flex items-center justify-center'>
        {done ? 'Rolling.' : null}
        <Countdown key={take} {...props} onComplete={() => setDone(true)} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-experimental/Countdown',
  component: Countdown,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Countdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    wait: true,
  },
};

export const Unattended: Story = {
  args: {
    wait: false,
  },
};
