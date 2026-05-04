//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { Matrix } from '@dxos/react-ui-sfx';
import { withTheme, withLayout } from '@dxos/react-ui/testing';

import { ChatStatus, type ChatStatusController, useChatStatusContext } from './ChatStatus';

const meta = {
  title: 'ui/react-ui-chat/ChatStatus',
  component: ChatStatus.Root,
  decorators: [
    withTheme(),
    withLayout({ layout: 'centered', classNames: 'py-1 px-2 border border-separator rounded-sm' }),
  ],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ChatStatus.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ChatStatus.Root>
      <ChatStatus.Icon />
      <ChatStatus.Stopwatch />
    </ChatStatus.Root>
  ),
};

export const WithMeta: Story = {
  render: () => (
    <ChatStatus.Root>
      <ChatStatus.Icon />
      <ChatStatus.Stopwatch />
      <ChatStatus.Separator />
      <ChatStatus.Text>↑ 234</ChatStatus.Text>
      <ChatStatus.Separator />
      <ChatStatus.Text>↓ 1.2k</ChatStatus.Text>
    </ChatStatus.Root>
  ),
};

/**
 * Reads the running flag from Status context and forwards it to the Matrix as
 * the `active` prop, so the Matrix runs its own internal interval loop only
 * while the Status tick is running. Pausing the Status freezes the dots.
 */
const MatrixIcon = () => {
  const { running } = useChatStatusContext('MatrixIcon');
  return (
    <Matrix
      classNames='mr-2'
      dim={4}
      dotSize={3}
      // TODO(burdon): Change with activity?
      count={10}
      interval={500}
      active={running}
    />
  );
};

export const WithCustomIcon: Story = {
  render: () => (
    <ChatStatus.Root classNames='text-sm'>
      <ChatStatus.Icon>
        <MatrixIcon />
      </ChatStatus.Icon>
      <ChatStatus.Stopwatch />
      <ChatStatus.Separator />
      <ChatStatus.Text>↑ 234</ChatStatus.Text>
      <ChatStatus.Separator />
      <ChatStatus.Text>↓ 1.2k</ChatStatus.Text>
    </ChatStatus.Root>
  ),
};

export const LongRunning: Story = {
  render: () => (
    <ChatStatus.Root>
      <ChatStatus.Icon />
      <ChatStatus.Stopwatch offset={65 * 60} />
      <ChatStatus.Separator />
      <ChatStatus.Text>↑ 4.5k</ChatStatus.Text>
      <ChatStatus.Separator />
      <ChatStatus.Text>↓ 12.3k</ChatStatus.Text>
    </ChatStatus.Root>
  ),
};

export const TextOnly: Story = {
  render: () => (
    <ChatStatus.Root>
      <ChatStatus.Icon />
      <ChatStatus.Text>Connecting…</ChatStatus.Text>
    </ChatStatus.Root>
  ),
};

/**
 * Demonstrates the imperative controller — start/stop the 1Hz tick from the outside.
 */
export const Controller: Story = {
  render: () => {
    const ref = useRef<ChatStatusController>(null);
    return (
      <div className='flex flex-col gap-4'>
        <Toolbar.Root>
          <Button onClick={() => ref.current?.start()}>Start</Button>
          <Button onClick={() => ref.current?.stop()}>Stop</Button>
        </Toolbar.Root>
        <ChatStatus.Root ref={ref}>
          <ChatStatus.Icon>
            <MatrixIcon />
          </ChatStatus.Icon>
          <ChatStatus.Stopwatch />
        </ChatStatus.Root>
      </div>
    );
  },
};
