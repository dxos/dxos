//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Trace, Trigger } from '@dxos/compute';
import { FeedTraceSink } from '@dxos/compute-runtime';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Routine } from '#types';

import { RoutineTraceCompanion } from './RoutineTraceCompanion';

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

/** Seed a routine, its backing trace feed, and a spread of success/failure/pending runs. */
const seed = (space: Space) =>
  Effect.gen(function* () {
    const trigger = Trigger.make({ enabled: true });
    space.db.add(Routine.make({ name: 'Summarize Notes', trigger }));
    const feed = space.db.add(
      Feed.make({ kind: FeedTraceSink.TRACE_FEED_KIND, name: 'Execution Trace', namespace: 'trace' }),
    );
    yield* Effect.promise(() => space.db.flush({ indexes: true }));

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

const withCompanion = () =>
  withPluginManager({
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types,
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* Effect.promise(() => client.halo.createIdentity());
            const space = yield* Effect.promise(() => client.spaces.create());
            yield* Effect.promise(() => space.waitUntilReady());
            yield* seed(space);
          }),
      }),
      RoutinePlugin(),
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
