//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type Progress } from '@dxos/progress';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ProgressMeter, type ProgressMeterProps } from './ProgressMeter';

const STEP = 3;
const TICK_MS = 400;

const DefaultStory = ({ state: stateProp, ...args }: ProgressMeterProps) => {
  const startRef = useRef(Date.now());
  const [state, setState] = useState<Progress.TaskProgress>(stateProp);
  useEffect(() => {
    startRef.current = Date.now();
    setState(stateProp);
    // Only a running task advances; error/done states render as-is.
    if (stateProp.status !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      setState((prev) => {
        // Loop back to 0 once complete (when a total is known) so the bar keeps animating.
        const looped = prev.total != null && prev.current >= prev.total;
        if (looped) {
          startRef.current = Date.now();
          clearInterval(interval);
          return prev;
        }

        const now = Date.now();
        return {
          ...prev,
          current: looped ? 0 : prev.current + STEP,
          startedAt: new Date(startRef.current).toISOString(),
          updatedAt: new Date(now).toISOString(),
          elapsedMs: now - startRef.current,
        };
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [stateProp]);

  return <Frame {...args} state={state} />;
};

/**
 * One step of a scripted run. A phase either counts (`total` set) or does not; a run that mixes the
 * two is the case this component exists to serve — see the `Curation` story.
 */
type Phase = {
  note: string;
  /** Omitted for a phase whose length is unknowable, e.g. one opaque model call. */
  total?: number;
  /** How long an uncounted phase runs; a counted one ends when it reaches `total`. */
  durationMs?: number;
};

/**
 * Runs a task through a scripted sequence of phases, so a story shows what a real multi-phase
 * operation looks like rather than one frozen frame. Cancelling stops the script where it stands.
 */
const PhasedStory = ({ state: stateProp, phases, ...args }: ProgressMeterProps & { phases: Phase[] }) => {
  const [state, setState] = useState<Progress.TaskProgress>(stateProp);
  // Bumped by Start; a run begins only when asked, so the elapsed clock and the cancel control can be
  // watched from zero rather than joined halfway.
  const [run, setRun] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    if (run === 0) {
      return;
    }

    cancelled.current = false;
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
      if (cancelled.current) {
        return;
      }

      const phase = phases[index];
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
  }, [run, stateProp, phases]);

  const handleStart = useCallback(() => {
    cancelled.current = true;
    // Stamp the start here, not in the args: the clock has to read from zero on Start, and a story
    // whose `startedAt` is baked in shows a run that was already going before anyone pressed anything.
    setState({ ...stateProp, status: 'running', startedAt: new Date().toISOString(), elapsedMs: 0 });
    setRun((run) => run + 1);
  }, [stateProp]);

  const handleCancel = useCallback(() => {
    cancelled.current = true;
    setState((prev) => ({ ...prev, status: 'error', error: 'Cancelled', updatedAt: new Date().toISOString() }));
  }, []);

  return (
    <Frame
      {...args}
      state={state}
      onCancel={handleCancel}
      onStart={handleStart}
      startLabel={run === 0 ? 'Start' : 'Restart'}
    />
  );
};

/** The statusbar the meter actually lives in, so a story shows it at its real placement. */
const Frame = ({
  state,
  onCancel,
  onStart,
  startLabel = 'Start',
  ...args
}: ProgressMeterProps & { onStart?: () => void; startLabel?: string }) => (
  <Panel.Root>
    <Panel.Toolbar asChild>
      <Toolbar.Root>
        {onStart && <IconButton icon='ph--play--regular' label={startLabel} onClick={onStart} />}
      </Toolbar.Root>
    </Panel.Toolbar>
    <Panel.Content />
    <Panel.Statusbar asChild>
      <ProgressMeter {...args} state={state} onCancel={onCancel} />
    </Panel.Statusbar>
  </Panel.Root>
);

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

const base = (overrides: Partial<Progress.TaskProgress>): Progress.TaskProgress => ({
  name: 'sync/mailbox',
  label: 'Syncing Inbox',
  current: 42,
  total: 120,
  status: 'running',
  startedAt: new Date(Date.now() - 8_000).toISOString(),
  updatedAt: new Date().toISOString(),
  elapsedMs: 8_000,
  cancellable: true,
  ...overrides,
});

/** A task that has not started: no clock, no bar movement, until Start is pressed. */
const idle = (overrides: Partial<Progress.TaskProgress>): Progress.TaskProgress =>
  base({ status: 'pending', startedAt: undefined, elapsedMs: 0, note: 'Idle', ...overrides });

export const Determinate: Story = {
  args: {
    state: base({}),
    onCancel: () => {},
  },
};

/**
 * A task whose length is unknowable — one opaque model call, a remote run reporting no item count.
 * No bar is drawn, because an indeterminate bar conveys nothing; the readout is elapsed time, which
 * at least answers "is this still going, and for how long".
 */
export const Indeterminate: Story = {
  args: {
    state: base({ label: 'Analyzing', total: undefined, note: 'Selecting articles' }),
    onCancel: () => {},
  },
};

/**
 * The case this is evolving towards: a run that COUNTS in one phase and cannot in the next. Magazine
 * curation syncs N feeds (countable), then makes a single agent call over every candidate (opaque),
 * then writes the result (countable). The bar appears for a counted phase and gives way to an elapsed
 * readout for the uncounted one, with the phase named underneath throughout — `label` holds the run's
 * identity and `note` the phase, so the task never reads as a different task mid-run.
 *
 * Press **Start**. Cancel mid-run to see how it ends.
 *
 * NOTE: this drives the state directly, because the transition is not yet expressible through the
 * registry: `TaskHandle.total()` only SETS a total, so a producer cannot return a task to
 * indeterminate once it has counted.
 */
export const Curation: Story = {
  render: (args) => (
    <PhasedStory
      {...args}
      phases={[
        { note: 'Syncing feeds', total: 5 },
        { note: 'Selecting articles', durationMs: 6_000 },
        { note: 'Adding to magazine', total: 3 },
      ]}
    />
  ),
  args: {
    state: idle({ name: 'curate/magazine', label: 'Curating Reading List', current: 0, total: 5 }),
    onCancel: () => {},
  },
};

/**
 * Cancelling is the only control an indeterminate run can offer, so it has to do something real.
 * Press **Start**, then the ✕: the script stops where it stands and the task reports why it ended.
 */
export const Cancellable: Story = {
  render: (args) => <PhasedStory {...args} phases={[{ note: 'Selecting articles', durationMs: 60_000 }]} />,
  args: {
    state: idle({ name: 'curate/magazine', label: 'Curating Reading List', total: undefined }),
    onCancel: () => {},
  },
};

/**
 * A run whose terminal status never arrived — the producer died, or its status could not be
 * replicated back. There is no liveness timeout, so this frame holds forever, offering a cancel
 * control for a run that is no longer there. Seen live on a mailbox stuck at `468 / 468`.
 */
export const Stalled: Story = {
  args: {
    state: base({
      current: 468,
      total: 468,
      note: 'Waiting for the run to report',
      startedAt: new Date(Date.now() - 45 * 60_000).toISOString(),
      elapsedMs: 45 * 60_000,
      status: 'pending',
    }),
    onCancel: () => {},
  },
};

export const Error: Story = {
  args: {
    state: base({ status: 'error', error: 'Network unreachable' }),
    onCancel: () => {},
  },
};
