//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { Matrix } from '@dxos/react-ui-sfx';
import { withTheme, withLayout } from '@dxos/react-ui/testing';

import { Status, type StatusController, useStatusContext } from './Status';

const meta = {
  title: 'ui/react-ui-components/Status',
  component: Status.Root,
  decorators: [
    withTheme(),
    withLayout({ layout: 'centered', classNames: 'py-1 px-2 border border-separator rounded-sm' }),
  ],
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
 * Reads the running flag from Status context and forwards it to the Matrix as
 * the `active` prop, so the Matrix runs its own internal interval loop only
 * while the Status tick is running. Pausing the Status freezes the dots.
 */
const MatrixIcon = () => {
  const { running } = useStatusContext('MatrixIcon');
  return <Matrix classNames='mr-2' active={running} interval={500} dim={5} size={3} dotSize={3} count={10} />;
};

export const WithCustomIcon: Story = {
  render: () => (
    <Status.Root classNames='text-sm'>
      <Status.Icon>
        <MatrixIcon />
      </Status.Icon>
      <Status.Stopwatch />
      <Status.Separator />
      <Status.Text>↑ 234</Status.Text>
      <Status.Separator />
      <Status.Text>↓ 1.2k</Status.Text>
    </Status.Root>
  ),
};

export const LongRunning: Story = {
  render: () => (
    <Status.Root>
      <Status.Icon />
      <Status.Stopwatch offset={65 * 60} />
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
