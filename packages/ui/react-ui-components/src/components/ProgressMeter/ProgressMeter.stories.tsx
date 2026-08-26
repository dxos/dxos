//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type Progress } from '@dxos/progress';
import { random } from '@dxos/random';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ProgressMeter, type ProgressMeterProps } from './ProgressMeter';

const TICK_MS = 200;
/** Items in a counted phase; the bar (or the line leaving a stage) fills as they are worked through. */
const ITEMS = 40;
/** How long an uncounted phase runs before the run moves on. */
const HOLD_MS = 2_500;
/**
 * Items completed per tick. Uneven, because real work is: a fixed step glides so smoothly that the
 * transition has nothing to smooth.
 */
const step = () => random.number.int({ min: 1, max: 4 });

/** Phase names, so the crawl has somewhere to go. */
const NOTES = ['Syncing feeds', 'Selecting articles', 'Adding to magazine'];

/**
 * At rest the meter already shows the shape of the run it is about to make: a stepper that only
 * appears once the run starts makes the row change under the reader for no reason they can act on,
 * and a counted run that sweeps until started reports the one thing it knows is untrue.
 */
const idle = (stages: number, indeterminate?: boolean): Progress.TaskProgress => ({
  name: 'progress/demo',
  updatedAt: new Date().toISOString(),
  label: 'Curating Reading List',
  current: 0,
  total: indeterminate ? undefined : ITEMS,
  status: 'pending',
  elapsedMs: 0,
  cancellable: true,
  phases: stages || undefined,
});

type StoryArgs = Partial<ProgressMeterProps> & {
  /** Stages the run declares; none means there is no plan to draw, only a fraction. */
  stages?: number;
  /** Run the phases uncounted, so nothing can be filled and the stage in flight spins. */
  indeterminate?: boolean;
};

/**
 * Drives a task through a scripted run, so the meter is watched from zero rather than joined halfway
 * — the only way to see the elapsed clock, the phase transitions and the cancel control do their job.
 */
const DefaultStory = ({ stages = 0, indeterminate, ...args }: StoryArgs) => {
  const [state, setState] = useState<Progress.TaskProgress>(() => idle(stages, indeterminate));
  const [run, setRun] = useState(0);
  const stopped = useRef(false);

  useEffect(() => {
    if (run === 0) {
      return;
    }

    stopped.current = false;
    const startedAt = new Date().toISOString();
    const start = Date.now();
    const phases = Math.max(1, stages);
    let phase = 0;
    let count = 0;

    const patch = (next: Partial<Progress.TaskProgress>) =>
      setState((prev) => ({ ...prev, ...next, startedAt, elapsedMs: Date.now() - start }));

    const interval = setInterval(() => {
      if (stopped.current) {
        return;
      }

      if (phase >= phases) {
        clearInterval(interval);
        // Past the last stage, not on it: a run parked on its final stage still reads as working.
        patch({ status: 'done', phase: stages ? stages : undefined, current: indeterminate ? 0 : ITEMS });
        return;
      }

      count += indeterminate ? TICK_MS : step();
      patch({
        status: 'running',
        phase: stages ? phase : undefined,
        note: NOTES[phase % NOTES.length],
        total: indeterminate ? undefined : ITEMS,
        current: indeterminate ? 0 : Math.min(ITEMS, count),
      });
      if (count >= (indeterminate ? HOLD_MS : ITEMS)) {
        phase += 1;
        count = 0;
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [run, stages, indeterminate]);

  const handleStart = useCallback(() => {
    stopped.current = true;
    // Stamped here, not in a fixture: the clock has to read from zero on start, and a baked-in
    // `startedAt` shows a run that was already going before anyone pressed anything.
    setState({
      ...idle(stages, indeterminate),
      status: 'running',
      startedAt: new Date().toISOString(),
      phases: stages || undefined,
      phase: stages ? 0 : undefined,
      total: indeterminate ? undefined : ITEMS,
    });
    setRun((run) => run + 1);
  }, [stages, indeterminate]);

  /** Cancelling is not a failure: the run simply stops, and the meter returns to where it began. */
  const handleCancel = useCallback(() => {
    stopped.current = true;
    setState(idle(stages, indeterminate));
  }, [stages, indeterminate]);

  const handleFail = useCallback(() => {
    stopped.current = true;
    setState((prev) => ({ ...prev, status: 'error', error: 'Network unreachable' }));
  }, []);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton icon='ph--play--regular' label='Start' onClick={handleStart} />
          <IconButton icon='ph--warning--regular' label='Fail' onClick={handleFail} />
          <IconButton icon='ph--x--regular' label='Reset' onClick={handleCancel} />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content />
      <Panel.Statusbar asChild>
        {/* The meter's own control cancels a run in flight, and clears one that failed. */}
        <ProgressMeter {...args} state={state} onCancel={handleCancel} />
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-components/ProgressMeter',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * No plan to draw, only a fraction: the crawl names the run and the phase, and a bar says how far
 * through it is.
 */
export const Default: Story = {};

/**
 * The same run with nothing to count. No fraction can be drawn honestly, so the bar sweeps and the
 * clock runs in place of a count.
 */
export const Indeterminate: Story = {
  args: {
    indeterminate: true,
  },
};

/**
 * A declared plan of three stages, each counted. The stages carry the fraction on the line leaving
 * the one in flight, so the plan and the progress within it are one drawing rather than two.
 */
export const Stepper: Story = {
  args: {
    stages: 3,
  },
};

/**
 * The same plan with nothing to count. No line can be filled honestly, so the stage in flight spins
 * and the clock runs in place of a count.
 */
export const StepperIndeterminate: Story = {
  args: {
    stages: 3,
    indeterminate: true,
  },
};
