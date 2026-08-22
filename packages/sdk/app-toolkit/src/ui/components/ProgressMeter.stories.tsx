//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type Progress } from '@dxos/progress';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ProgressMeter, type ProgressMeterProps } from './ProgressMeter';

const TICK_MS = 400;

/**
 * One step of a scripted run. A phase either counts (`total` set) or does not — a run that mixes the
 * two is the case the meter has to serve: magazine curation counts its feeds, then makes a single
 * opaque agent call, then counts what it writes.
 */
type Phase = {
  note: string;
  /** Omitted for a phase whose length is unknowable. */
  total?: number;
  /** How long an uncounted phase runs; a counted one ends when it reaches `total`. */
  durationMs?: number;
};

/** A run whose length is known throughout: a labelled bar with a count and an ETA. */
const DETERMINATE: Phase[] = [{ note: 'Fetching messages', total: 40 }];

/** A run that counts what it can and cannot count the rest — the case the meter exists for. */
const INDETERMINATE: Phase[] = [
  { note: 'Syncing feeds', total: 5 },
  { note: 'Selecting articles', durationMs: 8_000 },
  { note: 'Adding to magazine', total: 3 },
];

const IDLE: Progress.TaskProgress = {
  name: 'progress/demo',
  label: 'Curating Reading List',
  current: 0,
  status: 'pending',
  updatedAt: new Date().toISOString(),
  elapsedMs: 0,
  note: 'Idle',
  cancellable: true,
};

/**
 * Drives a task through a scripted run, so the meter is watched from zero rather than joined halfway
 * — the only way to see the elapsed clock, the phase transitions and the cancel control do their job.
 *
 * The toolbar starts either shape and forces a failure; the meter's own ✕ cancels.
 */
const DefaultStory = (args: ProgressMeterProps) => {
  const [state, setState] = useState<Progress.TaskProgress>(IDLE);
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

    const patch = (next: Partial<Progress.TaskProgress>) =>
      setState((prev) => ({
        ...prev,
        ...next,
        startedAt,
        updatedAt: new Date().toISOString(),
        elapsedMs: Date.now() - start,
      }));

    const interval = setInterval(() => {
      if (stopped.current) {
        return;
      }

      const phase = script.phases[index];
      if (!phase) {
        clearInterval(interval);
        patch({ status: 'done', note: 'Done' });
        return;
      }

      // A counted phase advances until it reaches its total; an uncounted one only runs the clock,
      // which is the point — there is nothing to count, so the meter shows elapsed instead.
      if (phase.total !== undefined) {
        count += 1;
        patch({ note: phase.note, total: phase.total, current: count });
        if (count >= phase.total) {
          index += 1;
          count = 0;
        }
      } else {
        count += TICK_MS;
        patch({ note: phase.note, total: undefined, current: 0 });
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
    // `startedAt` shows a run that was already going before anyone pressed anything.
    setState({ ...IDLE, status: 'running', startedAt: new Date().toISOString() });
    setScript(({ run }) => ({ phases, run: run + 1 }));
  }, []);

  const handleStop = useCallback((error: string) => {
    stopped.current = true;
    setState((prev) => ({ ...prev, status: 'error', error, updatedAt: new Date().toISOString() }));
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
          <IconButton icon='ph--warning--regular' label='Fail' onClick={() => handleStop('Network unreachable')} />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content />
      <Panel.Statusbar asChild>
        <ProgressMeter {...args} state={state} onCancel={() => handleStop('Cancelled')} />
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta = {
  title: 'sdk/app-toolkit/components/ProgressMeter',
  component: ProgressMeter,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ProgressMeter>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * **Determinate** counts to a known total: a bar, `n / total`, and an ETA.
 *
 * **Indeterminate** mixes both — it counts 5 feeds, then cannot count the agent call, then counts
 * again. The bar gives way to an elapsed readout where there is nothing to count, and the phase is
 * named underneath throughout: `label` holds the run's identity and `note` the phase, so the task
 * never reads as a different task mid-run.
 *
 * **Fail** ends the run with an error, and the meter's ✕ cancels — the only control an
 * indeterminate run can offer.
 */
export const Default: Story = {
  args: {
    state: IDLE,
  },
};
