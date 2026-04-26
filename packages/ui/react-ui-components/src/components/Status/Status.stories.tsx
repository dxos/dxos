//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { Matrix } from '@dxos/react-ui-sfx';
import { withTheme } from '@dxos/react-ui/testing';

import { Status, type StatusController, useStatusContext } from './Status';

const meta = {
  title: 'ui/react-ui-components/Status',
  component: Status.Root,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Status.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Status.Root>
      <Status.Icon />
      <Status.Stopwatch />
    </Status.Root>
  ),
};

export const WithMeta: Story = {
  render: () => (
    <Status.Root>
      <Status.Icon />
      <Status.Stopwatch />
      <Status.Separator />
      <Status.Text>↑ 234</Status.Text>
      <Status.Separator />
      <Status.Text>↓ 1.2k</Status.Text>
    </Status.Root>
  ),
};

/**
 * Reads the 1Hz tick from Status context and forwards it to the Matrix as
 * the `time` prop, so each second triggers a re-randomization of dot positions.
 */
const MatrixIcon = () => {
  const { time } = useStatusContext('MatrixIcon');
  return <Matrix dim={4} size={4} dotSize={3} count={10} time={time} />;
};

export const WithCustomIcon: Story = {
  render: () => (
    <Status.Root>
      <Status.Icon>
        <MatrixIcon />
      </Status.Icon>
      <Status.Stopwatch />
    </Status.Root>
  ),
};

export const LongRunning: Story = {
  render: () => (
    <Status.Root>
      <Status.Icon />
      <Status.Stopwatch start={Date.now() - 65 * 60 * 1_000} />
      <Status.Separator />
      <Status.Text>↑ 4.5k</Status.Text>
      <Status.Separator />
      <Status.Text>↓ 12.3k</Status.Text>
    </Status.Root>
  ),
};

export const TextOnly: Story = {
  render: () => (
    <Status.Root>
      <Status.Icon />
      <Status.Text>Connecting…</Status.Text>
    </Status.Root>
  ),
};

/**
 * Demonstrates the imperative controller — start/stop the 1Hz tick from the outside.
 */
export const Controller: Story = {
  render: () => {
    const ref = useRef<StatusController>(null);
    return (
      <div className='flex flex-col gap-4'>
        <Toolbar.Root>
          <Button onClick={() => ref.current?.start()}>Start</Button>
          <Button onClick={() => ref.current?.stop()}>Stop</Button>
        </Toolbar.Root>
        <Status.Root ref={ref}>
          <Status.Icon>
            <MatrixIcon />
          </Status.Icon>
          <Status.Stopwatch />
        </Status.Root>
      </div>
    );
  },
};
