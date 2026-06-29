//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Pulse, type PulseProps, type PulseSignal } from './Pulse';

type StoryArgs = PulseProps & { interval?: number };

const DefaultStory = (props: PulseProps) => {
  const [active, setActive] = useState(props.active ?? true);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Button onClick={() => setActive((a) => !a)}>{active ? 'Stop' : 'Start'}</Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='flex items-center justify-center'>
        <Pulse {...props} active={active} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-experimental/Pulse',
  component: Pulse,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Pulse>;

export default meta;

type Story = StoryObj<StoryArgs>;

// Radial wave emanating from the center.
const radialWave: PulseSignal = (i, j, time) => {
  const dx = i - 7 / 2;
  const dy = j - 7 / 2;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return 0.5 + 0.5 * Math.sin(time * 2 - distance * 0.9);
};

export const Default: Story = {
  args: {
    dim: 8,
    maxRadius: 10,
    minRadius: 1,
    gap: 6,
    smoothing: 0.2,
    classNames: 'text-primary-500',
    getSignal: radialWave,
  },
};

// Each column pulses with a phase-shifted sine — vertical bars sweeping across the grid.
const ripple: PulseSignal = (i, j, time) => 0.5 + 0.5 * Math.sin(time * 3 + Math.sin((i + j) / 3) * 0.6);

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
      <Panel.Content classNames='flex items-center justify-center'>
        <PointerStory {...props} />
      </Panel.Content>
    </Panel.Root>
  ),
  args: {
    dim: 8,
    maxRadius: 6,
    minRadius: 0.5,
    gap: 2,
    smoothing: 0.04,
    growSmoothing: 1,
    classNames: 'text-sky-500',
  },
};

// Randomly pings dots that then decay back to zero.
const RandomPing = (props: StoryArgs) => {
  const { dim = 4, interval = 100 } = props;
  const valuesRef = useRef<Float32Array>(new Float32Array(dim * dim));
  const lastTimeRef = useRef(0);

  useEffect(() => {
    valuesRef.current = new Float32Array(dim * dim);
    lastTimeRef.current = 0;
  }, [dim]);

  useEffect(() => {
    const id = setInterval(() => {
      valuesRef.current[Math.floor(Math.random() * valuesRef.current.length)] = 1;
    }, interval);

    return () => clearInterval(id);
  }, [interval]);

  const getSignal = useCallback<PulseSignal>(
    (i, j, time) => {
      if (time !== lastTimeRef.current) {
        const dt = lastTimeRef.current === 0 ? 0 : time - lastTimeRef.current;
        // Exponential decay; half-life ≈ 0.46s.
        const decay = Math.exp(-dt * 1.5);
        const values = valuesRef.current;
        for (let k = 0; k < values.length; k++) {
          values[k] *= decay;
        }
        lastTimeRef.current = time;
      }
      return valuesRef.current[i * dim + j];
    },
    [dim],
  );

  return <Pulse {...props} getSignal={getSignal} />;
};

export const Matrix: Story = {
  render: (props) => (
    <Panel.Root>
      <Panel.Content classNames='flex items-center justify-center'>
        <RandomPing {...props} />
      </Panel.Content>
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
      <Panel.Content classNames='flex items-center justify-center'>
        <RandomPing {...props} />
      </Panel.Content>
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
