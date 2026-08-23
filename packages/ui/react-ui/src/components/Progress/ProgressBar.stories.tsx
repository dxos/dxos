//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { withLayout, withTheme } from '../../testing';
import { Panel } from '../Panel';
import { Toolbar } from '../Toolbar';
import { Progress, type ProgressBarProps } from './Progress';

const TICK_MS = 100;
const STEP = 0.01;

type StoryArgs = Partial<ProgressBarProps>;

/**
 * Runs the bar from empty to full so the width transition is watched rather than sampled: a static
 * fraction says nothing about whether an advance glides or jumps.
 *
 * **Fail** stops it where it got to and repaints it — the one state where a partial bar is the
 * point, since it says how far the run got before it broke.
 */
const DefaultStory = ({ indeterminate, error, ...props }: StoryArgs) => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!running) {
      return;
    }

    const interval = setInterval(
      () =>
        setProgress((progress) => {
          const next = Math.min(1, progress + STEP);
          if (next === 1) {
            setRunning(false);
          }
          return next;
        }),
      TICK_MS,
    );
    return () => clearInterval(interval);
  }, [running]);

  const handleStart = useCallback(() => {
    setFailed(false);
    setRunning(true);
  }, []);

  const handleFail = useCallback(() => {
    setRunning(false);
    setFailed(true);
  }, []);

  const handleReset = useCallback(() => {
    setRunning(false);
    setFailed(false);
    setProgress(0);
  }, []);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={handleStart}>Start</Toolbar.Button>
          <Toolbar.Button onClick={() => setRunning(false)}>Stop</Toolbar.Button>
          <Toolbar.Button onClick={handleFail}>Fail</Toolbar.Button>
          <Toolbar.Button onClick={handleReset}>Reset</Toolbar.Button>
          <div className='flex-1' />
          <div className='p-2 font-mono text-subdued'>{Math.round(progress * 100)}%</div>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content />
      <Panel.Statusbar asChild>
        <div className='p-2'>
          <Progress.Bar {...props} progress={progress} indeterminate={indeterminate} error={error ?? failed} />
        </div>
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Progress/Bar',
  component: Progress.Bar,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Progress.Bar>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The bare bar at a known fraction, for a host that supplies its own chrome. **Start** runs it to
 * full; the fill eases between ticks rather than stepping.
 */
export const Determinate: Story = {};

/**
 * No fraction to draw: the fill sweeps instead of resting somewhere misleading. The toolbar's
 * counter still advances, to show the sweep owes nothing to the underlying value.
 */
export const Indeterminate: Story = {
  args: {
    indeterminate: true,
  },
};
