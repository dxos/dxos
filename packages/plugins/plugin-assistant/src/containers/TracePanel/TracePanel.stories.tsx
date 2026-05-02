//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { PropsWithChildren, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { addEventListener } from '@dxos/async';
import { Process, Trace } from '@dxos/compute';
import { Feed, Filter, Query } from '@dxos/echo';
import { FeedTraceSink, ProcessManager } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { useComputeRuntime } from '@dxos/plugin-automation/hooks';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { Timeline } from '@dxos/react-ui-components';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { AssistantPlugin } from '../../cli';
import { buildExecutionGraph } from './execution-graph';
import { PLAYBACK_INTERVAL_MS, STEP_STORAGE_KEY, SimulatedAgent, useLocalStorageNumber } from './testing';
import { TracePanel } from './TracePanel';

type BaseStoryProps = PropsWithChildren<{
  toolbar: ReactNode;
}>;

const BaseStory = ({ children, toolbar }: BaseStoryProps) => (
  <Panel.Root>
    <Panel.Toolbar asChild>{toolbar}</Panel.Toolbar>
    <Panel.Content asChild>{children}</Panel.Content>
  </Panel.Root>
);

const DefaultStory = () => {
  const [space] = useSpaces();
  const runtime = useComputeRuntime(space?.id);

  const handleStart = useCallback(() => {
    if (!runtime) {
      return;
    }

    void runtime.runPromise(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(SimulatedAgent);
        yield* handle.submitInput(Math.floor(Math.random() * 1_000));
        log.info('submitInput', { handle });
      }),
    );
  }, [runtime]);

  // TODO(burdon): Implement.
  const handleStop = useCallback(
    (process: Process.Info) => {
      log.info('stop', { process });
    },
    [runtime],
  );

  return (
    <BaseStory
      toolbar={
        <Toolbar.Root>
          <IconButton icon='ph--plus--regular' label='Start Agent' onClick={handleStart} />
        </Toolbar.Root>
      }
    >
      <TracePanel space={space} attendableId={space.id} onProcessTerminate={handleStop} />
    </BaseStory>
  );
};

const SnapshotStory = () => {
  const [space] = useSpaces();
  const [feed] = useQuery(space?.db, FeedTraceSink.query);

  // All messages.
  const allMessages = useQuery(
    space?.db,
    feed ? Query.select(Filter.everything()).from(feed) : Query.select(Filter.nothing()),
  );

  // Sort by first event timestamp so playback order is chronological regardless of query ordering.
  const sortedMessages = useMemo(
    () => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.events[0]?.timestamp ?? 0)),
    [allMessages],
  );

  const total = sortedMessages.length;
  const [step, setStep, stepHydrated] = useLocalStorageNumber(STEP_STORAGE_KEY, 0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setStep((current) => Math.min(Math.max(current, 0), total));
  }, [total, setStep]);

  // Start with all messages loaded once the snapshot first arrives; afterwards the user controls `step`.
  // Skip the auto-init if we restored a value from localStorage so we don't clobber the user's last position.
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && total > 0) {
      hasInitializedRef.current = true;
      if (!stepHydrated) {
        setStep(total);
      }
    }
  }, [total, stepHydrated, setStep]);

  const visibleMessages = useMemo(() => sortedMessages.slice(0, step), [sortedMessages, step]);
  const { commits, branches } = useMemo(
    () => buildExecutionGraph({ traceMessages: visibleMessages }),
    [visibleMessages],
  );

  // Auto-play steps forward until we reach the end.
  useEffect(() => {
    if (!playing) {
      return;
    }
    const id = window.setInterval(() => {
      setStep((current) => {
        if (current >= total) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, PLAYBACK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, total]);

  // Handlers.
  const handleNext = useCallback(() => setStep((current) => Math.min(current + 1, total)), [total]);
  const handlePrev = useCallback(() => setStep((current) => Math.max(current - 1, 0)), []);
  const handleReset = useCallback(() => {
    setStep(0);
    setPlaying(false);
  }, []);
  const handleShowAll = useCallback(() => {
    setStep(total);
    setPlaying(false);
  }, [total]);
  const handleTogglePlay = useCallback(() => setPlaying((previous) => !previous), []);

  // Keyboard shortcuts: ←/h step back, →/l step forward, space play/pause, r reset, e/End show all.
  useEffect(() => {
    return addEventListener(window, 'keydown', (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
        case 'l':
          event.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
        case 'h':
          event.preventDefault();
          handlePrev();
          break;
        case ' ':
          event.preventDefault();
          handleTogglePlay();
          break;
        case 'r':
          event.preventDefault();
          handleReset();
          break;
        case 'e':
        case 'End':
          event.preventDefault();
          handleShowAll();
          break;
      }
    });
  }, [handleNext, handlePrev, handleTogglePlay, handleReset, handleShowAll]);

  return (
    <BaseStory
      toolbar={
        <Toolbar.Root>
          <IconButton iconOnly icon='ph--skip-back--regular' label='Reset (R)' onClick={handleReset} />
          <IconButton iconOnly icon='ph--caret-left--regular' label='Step back (← / H)' onClick={handlePrev} />
          <IconButton
            iconOnly
            icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
            label={playing ? 'Pause (Space)' : 'Play (Space)'}
            onClick={handleTogglePlay}
          />
          <IconButton iconOnly icon='ph--caret-right--regular' label='Step forward (→ / L)' onClick={handleNext} />
          <IconButton iconOnly icon='ph--skip-forward--regular' label='Show all (E / End)' onClick={handleShowAll} />
          <Toolbar.Separator />
          <Toolbar.Text className='text-sm tabular-nums opacity-70'>
            `${step} / ${total}`
          </Toolbar.Text>
        </Toolbar.Root>
      }
    >
      <Timeline branches={branches} commits={commits} showTimestamp />
    </BaseStory>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/containers/TracePanel',
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column', classNames: 'w-(--dx-complementary-sidebar-size) overflow-hidden' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Trace.Message],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
            }),
        }),
        AssistantPlugin(),
        AutomationPlugin(),
      ],
    }),
  ],
};

export const WithSnapshot: Story = {
  render: SnapshotStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column', classNames: 'w-(--dx-complementary-sidebar-size)' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Trace.Message],
          onClientInitialized: ({ client }) =>
            Effect.promise(async () => {
              await client.halo.createIdentity();
              const data = await import('../../testing/data/trace-timeline.dx.json');
              const space = await client.spaces.import({
                filename: 'trace-events.dx.json',
                contents: new TextEncoder().encode(JSON.stringify(data)),
              });
              await space.db.flush();
            }),
        }),
        AutomationPlugin(),
      ],
    }),
  ],
};
