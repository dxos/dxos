//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import React, { type ComponentProps, useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as Progress from '@dxos/app-toolkit/Progress';
import { FeedTraceSink } from '@dxos/compute-runtime';
import * as Process from '@dxos/compute/Process';
import * as Routine from '@dxos/compute/Routine';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { ProgressMeter } from '@dxos/react-ui-components';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { makeRoutine } from '../../util/index.ts';
import { RoutineTraceCompanion } from './RoutineTraceCompanion.tsx';

const types = [Routine.Routine, Trigger.Trigger, Feed.Feed, Trace.Message];

// Fixed base so the seeded runs render deterministically across reloads.
const BASE = new Date('2026-06-26T09:00:00Z').getTime();

const event = (type: string, offset: number, data: unknown = { key: 'summarize' }): Trace.Event => ({
  type,
  timestamp: BASE + offset,
  data,
});

/** Build a single-message run whose events match the routine's trigger. */
const runMessage = (opts: {
  pid: string;
  trigger: Ref.Ref<Trigger.Trigger>;
  events: Trace.Event[];
  processName?: string;
}) =>
  Obj.make(Trace.Message, {
    meta: { pid: opts.pid, processName: opts.processName, trigger: opts.trigger },
    isEphemeral: false,
    events: opts.events,
  });

/** Seed a routine, its backing trace feed, and (unless `empty`) a spread of success/failure/pending runs. */
const seed = (space: Space, { empty = false }: { empty?: boolean } = {}) =>
  Effect.gen(function* () {
    const trigger = Trigger.make({ enabled: true });
    space.db.add(makeRoutine({ name: empty ? 'Sync Mail' : 'Summarize Notes', trigger }));
    const feed = space.db.add(
      Feed.make({ kind: FeedTraceSink.TRACE_FEED_KIND, name: 'Execution Trace', namespace: 'trace' }),
    );
    yield* Effect.promise(() => space.db.flush({ indexes: true }));
    if (empty) {
      return;
    }

    const triggerRef = Ref.make(trigger);
    const messages = [
      runMessage({
        pid: 'run-0001',
        trigger: triggerRef,
        processName: 'summarize-notes',
        events: [
          event(Trace.OperationStart.key, 0),
          event('tool.call', 800, { tool: 'fetch' }),
          event(Trace.OperationEnd.key, 2500, { key: 'summarize', outcome: 'success' }),
        ],
      }),
      runMessage({
        pid: 'run-0002',
        trigger: triggerRef,
        events: [
          event(Trace.OperationStart.key, -60_000),
          event(Trace.OperationEnd.key, -57_400, { key: 'summarize', outcome: 'failure' }),
        ],
      }),
      runMessage({
        pid: 'run-0003',
        trigger: triggerRef,
        events: [event(Trace.OperationStart.key, -300_000)],
      }),
    ];

    yield* Feed.append(feed, messages).pipe(Effect.provide(Database.layer(space.db)));
    yield* Effect.promise(() => space.db.flush({ indexes: true }));
  });

const withCompanion = ({ empty }: { empty?: boolean } = {}) =>
  withPluginManager({
    plugins: [
      ...CorePlugins.make(),
      ClientPlugin.make({
        types,
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* Effect.promise(() => client.halo.createIdentity());
            const space = yield* Effect.promise(() => client.spaces.create());
            yield* Effect.promise(() => space.waitUntilReady());
            yield* seed(space, { empty });
          }),
      }),
      RoutinePlugin.make(),
    ],
  });

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [routine] = useQuery(space?.db, Filter.type(Routine.Routine));
  if (!routine || !space?.db) {
    return <Loading />;
  }
  return <RoutineTraceCompanion role='article' subject={routine} />;
};

/** Messages a capped mail backfill syncs per invocation; every invocation but the last calls `Operation.runAgain()`. */
const CHAIN_BATCHES = [40, 40, 25];
/**
 * Each invocation's estimate of the messages left, its own batch included, as the provider reports it
 * (Gmail's `resultSizeEstimate`). The first is low; the next run's refresh corrects it.
 */
const CHAIN_ESTIMATES = [100, 65, 25];
const SYNC_KEY = 'mailbox#sync';
const SYNC_LABEL = 'Syncing Inbox';

type ChainStep =
  | { at: number; kind: 'status'; pid: string; message: string; progress: { current?: number; total?: number } }
  | { at: number; kind: 'trace'; pid: string; runId?: string; type: string; data: unknown };

/**
 * A `runAgain` chain as the trigger dispatcher runs it: one process per batch, each continuation carrying the
 * first invocation's pid as `runId`. Status updates follow mail sync: each run counts its own batch from zero
 * against a total of the messages left, and only the last one reports complete.
 */
const chainSteps = (): ChainStep[] => {
  const steps: ChainStep[] = [];
  let at = 1_000;
  CHAIN_BATCHES.forEach((batch, index) => {
    const total = CHAIN_ESTIMATES[index];
    const pid = `sync-${index + 1}`;
    const runId = index === 0 ? undefined : 'sync-1';
    const last = index === CHAIN_BATCHES.length - 1;
    const status = (progress: { current?: number; total?: number }, message = SYNC_LABEL) =>
      steps.push({ at, kind: 'status', pid, message, progress });
    steps.push({ at, kind: 'trace', pid, runId, type: Trace.OperationStart.key, data: { key: 'sync', name: 'Sync' } });
    status({ current: 0 });
    at += 400;
    status({ current: 0, total });
    for (let current = 5; current <= batch; current += 5) {
      at += 200;
      status({ current, total });
    }
    at += 300;
    steps.push({
      at,
      kind: 'trace',
      pid,
      runId,
      type: Trace.OperationEnd.key,
      data: last
        ? { key: 'sync', name: 'Sync', outcome: 'success' }
        : {
            key: 'sync',
            name: 'Sync',
            outcome: 'failure',
            error: Process.RUN_AGAIN_MESSAGE,
            errorCode: Process.RUN_AGAIN_ERROR_CODE,
          },
    });
    if (last) {
      status({}, Progress.STATUS_COMPLETE);
    }
    at += 1_500;
  });
  return steps;
};

type ProgressState = ComponentProps<typeof ProgressMeter>['state'];

/** Replays {@link chainSteps}: status updates through the progress trace sink, trace messages into the feed. */
const SyncChainStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [routine] = useQuery(space?.db, Filter.type(Routine.Routine));
  const [feed] = useQuery(space?.db, FeedTraceSink.query);
  const [progress, setProgress] = useState<ProgressState>();

  useEffect(() => {
    const trigger = routine?.triggers[0];
    if (!space || !feed || !trigger) {
      return;
    }
    const atoms = AtomRegistry.make();
    const registry = Progress.makeRegistry(atoms);
    const sink = Progress.makeTraceSink(registry);
    const unsubscribe = atoms.subscribe(registry.monitorAtom(SYNC_KEY), setProgress, { immediate: true });
    const timers = chainSteps().map((step) =>
      setTimeout(() => {
        if (step.kind === 'status') {
          sink.write(
            Obj.make(Trace.Message, {
              meta: { pid: step.pid },
              isEphemeral: true,
              events: [
                {
                  type: Trace.StatusUpdate.key,
                  timestamp: Date.now(),
                  data: { message: step.message, progress: { key: SYNC_KEY, ...step.progress } },
                },
              ],
            }),
          );
          return;
        }
        const message = Obj.make(Trace.Message, {
          meta: { pid: step.pid, runId: step.runId, processName: 'Sync', trigger },
          isEphemeral: false,
          events: [{ type: step.type, timestamp: Date.now(), data: step.data }],
        });
        void Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(space.db)), EffectEx.runAndForwardErrors);
      }, step.at),
    );
    return () => {
      timers.forEach(clearTimeout);
      unsubscribe();
    };
  }, [space, feed, routine]);

  if (!routine) {
    return <Loading />;
  }
  return (
    <div className='flex flex-col h-full' data-testid='run-again-chain'>
      <ProgressMeter state={progress?.status === 'running' || progress?.status === 'error' ? progress : undefined} />
      <RoutineTraceCompanion role='article' subject={routine} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-routine/containers/RoutineTraceCompanion',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withCompanion()],
};

/**
 * A sync that continues with `Operation.runAgain()` across three batches: the progress meter above, the
 * routine's run history below. Replays from the start on every load.
 */
export const RunAgainChain: Story = {
  render: SyncChainStory,
  decorators: [withCompanion({ empty: true })],
};
