//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { withLayout, withTheme } from '../../testing';
import { IconButton } from '../Button';
import { Panel } from '../Panel';
import { Toolbar } from '../Toolbar';

import { Progress, type ProgressRootProps } from './Progress';
import { type ProgressState } from './types';

const TICK_MS = 400;

/**
 * One step of a scripted run. A phase either counts (`total` set) or does not — a run that mixes the
 * two is the case the readout has to serve: magazine curation counts its feeds, then makes a single
 * opaque agent call, then counts what it writes.
 */
type Phase = {
  note: string;
  /** Omitted for a phase whose length is unknowable. */
  total?: number;
  /** How long an uncounted phase runs; a counted one ends when it reaches `total`. */
  durationMs?: number;
};

/** A run whose length is known throughout: a bar with a count and an ETA. */
const DETERMINATE: Phase[] = [{ note: 'Fetching messages', total: 40 }];

/** A run that counts what it can and cannot count the rest — the case the readout exists for. */
const PHASED: Phase[] = [
  { note: 'Syncing feeds', total: 5 },
  { note: 'Selecting articles', durationMs: 8_000 },
  { note: 'Adding to magazine', total: 3 },
];

/** A run that never counts anything: one opaque call, start to finish. */
const INDETERMINATE: Phase[] = [{ note: 'Asking the agent', durationMs: 20_000 }];

const IDLE: ProgressState = {
  label: 'Curating Reading List',
  current: 0,
  status: 'pending',
  elapsedMs: 0,
  note: 'Idle',
  cancellable: true,
};

/**
 * Drives a task through a scripted run, so the readout is watched from zero rather than joined
 * halfway — the only way to see the elapsed clock, the phase transitions and the cancel control do
 * their job.
 *
 * The toolbar starts each shape and forces a failure; the readout's own ✕ cancels.
 */
const DefaultStory = (args: ProgressRootProps) => {
  const [state, setState] = useState<ProgressState>(IDLE);
  const [script, setScript] = useState<{ phases: Phase[]; run: number }>({ phases: [], run: 0 });
  const stopped = useRef(false);

  useEffect(() => {
    if (script.run === 0) {
      return;
    }

    stopped.current = false;
    const startedAt = new Date().toISOString();
    const start = Date.now();
    let index = 0;
    let count = 0;

    const patch = (next: Partial<ProgressState>) =>
      setState((prev) => ({
        ...prev,
        ...next,
        startedAt,
        elapsedMs: Date.now() - start,
      }));

    const interval = setInterval(() => {
      if (stopped.current) {
        return;
      }

      const phase = script.phases[index];
      if (!phase) {
        clearInterval(interval);
        patch({ status: 'done', note: 'Done', phase: script.phases.length - 1 });
        return;
      }

      // A counted phase advances until it reaches its total; an uncounted one only runs the clock,
      // which is the point — there is nothing to count, so the readout shows elapsed instead.
      if (phase.total !== undefined) {
        count += 1;
        patch({ note: phase.note, phase: index, total: phase.total, current: count });
        if (count >= phase.total) {
          index += 1;
          count = 0;
        }
      } else {
        count += TICK_MS;
        patch({ note: phase.note, phase: index, total: undefined, current: 0 });
        if (count >= (phase.durationMs ?? 3_000)) {
          index += 1;
          count = 0;
        }
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [script]);

  const handleStart = useCallback((phases: Phase[]) => {
    stopped.current = true;
    // Stamped here, not in a fixture: the clock has to read from zero on start, and a baked-in
    // `startedAt` shows a run that was already going before anyone pressed anything. `phases` is the
    // plan's length; the readout draws one circle per phase and marks the one in flight.
    setState({ ...IDLE, status: 'running', startedAt: new Date().toISOString(), phases: phases.length, phase: 0 });
    setScript(({ run }) => ({ phases, run: run + 1 }));
  }, []);

  /** Cancelling is not a failure: the run simply stops, and the readout returns to where it began. */
  const handleCancel = useCallback(() => {
    stopped.current = true;
    setState({ ...IDLE });
  }, []);

  const handleFail = useCallback(() => {
    stopped.current = true;
    setState((prev) => ({
      ...prev,
      status: 'error',
      error: 'Network unreachable',
    }));
  }, []);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton icon='ph--play--regular' label='Determinate' onClick={() => handleStart(DETERMINATE)} />
          <IconButton
            icon='ph--dots-three-outline--regular'
            label='Indeterminate'
            onClick={() => handleStart(INDETERMINATE)}
          />
          <IconButton icon='ph--list-checks--regular' label='Phased' onClick={() => handleStart(PHASED)} />
          <IconButton icon='ph--warning--regular' label='Fail' onClick={handleFail} />
          <IconButton icon='ph--x--regular' label='Cancel' onClick={handleCancel} />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content />
      <Panel.Statusbar asChild>
        {/* The readout's own control cancels a run in flight, and clears one that failed. */}
        <Progress.Root {...args} state={state} onCancel={handleCancel} />
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Progress',
  component: Progress.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Progress.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * One component, three shapes, one geometry.
 *
 * **Determinate** counts to a known total: a filled bar, `n / total`, and an ETA.
 * **Indeterminate** never counts: the bar sweeps and the clock runs instead of a fraction.
 * **Phased** mixes both — it counts 5 feeds, cannot count the agent call, then counts again; one
 * circle per phase marks where the run is even while the phase in flight is uncountable.
 *
 * The rows never change height between them, so the surface around the readout never moves.
 * `label` holds the run's identity and the crawl underneath names the phases as they pass, so the
 * task never reads as a different task mid-run.
 *
 * **Fail** ends the run with an error. **Cancel** — in the toolbar, or the readout's own ✕ — stops a
 * run and returns it to idle: cancelling is not a failure, so it leaves no error behind. The ✕ stays
 * available on a failed run, where it clears the error rather than cancelling anything.
 */
export const Default: Story = {
  args: {
    state: IDLE,
  },
};
