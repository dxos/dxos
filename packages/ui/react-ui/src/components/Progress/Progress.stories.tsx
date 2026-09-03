//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { random } from '@dxos/random';

import { withLayout, withTheme } from '../../testing/index.ts';
import { Panel } from '../Panel/index.ts';
import { Toolbar } from '../Toolbar/index.ts';
import { Progress, type ProgressProps } from './Progress.tsx';

const TICK_MS = 100;
/**
 * Advances by an uneven amount, because real work does: a fixed step glides so smoothly that the
 * width transition has nothing to smooth, and a bar that only ever looks good on even increments is
 * not tested at all.
 */
const step = () => random.number.int({ min: 1, max: 6 }) / 100;

type StoryArgs = Partial<ProgressProps>;

/**
 * Runs the bar from empty to full so the width transition is watched rather than sampled: a static
 * fraction says nothing about whether an advance glides or jumps.
 *
 * **Fail** stops it where it got to and repaints it — the one state where a partial bar is the
 * point, since it says how far the run got before it broke. An uncounted run has no such place, so
 * failing fills it instead.
 */
const DefaultStory = ({ indeterminate, error, ...props }: StoryArgs) => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // An uncounted run has no fraction to accumulate — counting one anyway is what left a stub of
    // fill behind when it stopped.
    if (!running || indeterminate) {
      return;
    }

    const interval = setInterval(
      () =>
        setProgress((progress) => {
          const next = Math.min(1, progress + step());
          if (next === 1) {
            setRunning(false);
          }
          return next;
        }),
      TICK_MS,
    );
    return () => clearInterval(interval);
  }, [running, indeterminate]);

  const handleStart = useCallback(() => {
    setFailed(false);
    setRunning(true);
  }, []);

  const handleStop = useCallback(() => {
    setFailed(false);
    setRunning(false);
  }, []);

  const handleFail = useCallback(() => {
    setFailed(true);
    setRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setFailed(false);
    setRunning(false);
    setProgress(0);
  }, []);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={handleStart}>Start</Toolbar.Button>
          <Toolbar.Button onClick={handleStop}>Stop</Toolbar.Button>
          <Toolbar.Button onClick={handleFail}>Fail</Toolbar.Button>
          <Toolbar.Button onClick={handleReset}>Reset</Toolbar.Button>
          <Toolbar.Separator />
          <div className='p-2 tabular-nums text-description text-sm'>{Math.round(progress * 100)}%</div>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='h-6' />
      <Panel.Statusbar>
        {/* The sweep is what `running` looks like when nothing counts; stopping it has to leave
            something behind, so the bar falls back to the fraction the run did reach. */}
        <Progress
          {...props}
          progress={progress}
          // A stopped run is no longer uncounted, it is simply idle — so the sweep gives way to an
          // empty bar. A FAILED one stays uncounted, which is what fills it red.
          indeterminate={indeterminate && (running || failed)}
          error={error ?? failed}
        />
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Progress',
  component: Progress,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[30rem]' })],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Progress>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The bare bar at a known fraction, for a host that supplies its own chrome. **Start** runs it to
 * full; the fill eases between ticks rather than stepping.
 */
export const Default: Story = {};

/**
 * No fraction to draw: the fill sweeps instead of resting somewhere misleading. The toolbar's
 * counter still advances, to show the sweep owes nothing to the underlying value.
 */
export const Indeterminate: Story = {
  args: {
    indeterminate: true,
  },
};
