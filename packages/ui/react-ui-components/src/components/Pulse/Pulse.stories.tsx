//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useRef, useState } from 'react';

import { Button, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Pulse, type PulseProps, type PulseSignal } from './Pulse.tsx';
import { radialWave, ripple, useRandomPing } from './signals.ts';

type StoryArgs = PulseProps & { interval?: number };

const DefaultStory = (props: PulseProps) => {
  const [active, setActive] = useState(props.active ?? true);

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Button onClick={() => setActive((a) => !a)}>{active ? 'Stop' : 'Start'}</Button>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='flex items-center justify-center'>
        <Pulse {...props} active={active} />
      </Panel.Body>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-components/Pulse',
  component: Pulse,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Pulse>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: {
    dim: 8,
    maxRadius: 10,
    minRadius: 1,
    gap: 6,
    smoothing: 0.2,
    classNames: 'text-primary-500',
    getSignal: radialWave(8),
  },
};

export const Ripple: Story = {
  args: {
    dim: 12,
    maxRadius: 2,
    minRadius: 0,
    gap: 8,
    smoothing: 0.3,
    classNames: 'text-emerald-500',
    getSignal: ripple,
  },
};

// Grows the single dot under the cursor; smoothing eases it back down when the cursor moves or leaves.
const PointerStory = (props: PulseProps) => {
  const { maxRadius = 8, gap = 4 } = props;
  const stride = 2 * maxRadius + gap;
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<{ i: number; j: number } | null>(null);

  const onMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const canvas = containerRef.current?.querySelector('canvas');
      if (!canvas) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      if (px < 0 || py < 0 || px >= rect.width || py >= rect.height) {
        cursorRef.current = null;
        return;
      }
      cursorRef.current = { i: Math.floor(px / stride), j: Math.floor(py / stride) };
    },
    [stride],
  );

  const onLeave = useCallback(() => {
    cursorRef.current = null;
  }, []);

  const getSignal = useCallback<PulseSignal>((i, j) => {
    const cursor = cursorRef.current;
    return cursor && cursor.i === i && cursor.j === j ? 1 : 0;
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className='flex grow items-center justify-center'
    >
      <Pulse {...props} getSignal={getSignal} />
    </div>
  );
};

export const Pointer: Story = {
  render: (props) => (
    <Panel.Root>
      <Panel.Body classNames='flex items-center justify-center'>
        <PointerStory {...props} />
      </Panel.Body>
    </Panel.Root>
  ),
  args: {
    dim: 12,
    maxRadius: 6,
    minRadius: 0.5,
    gap: 2,
    smoothing: 0.03,
    growSmoothing: 1,
    classNames: 'text-sky-500',
  },
};

// Randomly pings dots that then decay back to zero.
const RandomPing = (props: StoryArgs) => {
  const { dim = 4, interval = 100 } = props;
  const getSignal = useRandomPing(dim, interval);
  return <Pulse {...props} getSignal={getSignal} />;
};

export const Matrix: Story = {
  render: (props) => (
    <Panel.Root>
      <Panel.Body classNames='flex items-center justify-center'>
        <RandomPing {...props} />
      </Panel.Body>
    </Panel.Root>
  ),
  args: {
    dim: 50,
    maxRadius: 2,
    minRadius: 0.25,
    gap: 4,
    smoothing: 0.5,
    classNames: 'text-green-500',
    interval: 5,
  },
};

export const Icon: Story = {
  render: (props) => (
    <Panel.Root>
      <Panel.Body classNames='flex items-center justify-center'>
        <RandomPing {...props} />
      </Panel.Body>
    </Panel.Root>
  ),
  args: {
    dim: 4,
    maxRadius: 3,
    minRadius: 0.5,
    gap: 0,
    smoothing: 0.5,
    classNames: 'text-primary-500',
    interval: 100,
  },
};
