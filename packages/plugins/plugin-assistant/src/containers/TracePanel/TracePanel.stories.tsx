//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AgentRequestBegin, AgentRequestEnd, CompleteBlock } from '@dxos/assistant';
import { Process, Trace } from '@dxos/compute';
import { Feed } from '@dxos/echo';
import { Filter, Query } from '@dxos/echo';
import { FeedTraceSink, ProcessManager } from '@dxos/functions-runtime';
import { ObjectId } from '@dxos/keys';
import { dbg } from '@dxos/log';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { useComputeRuntime } from '@dxos/plugin-automation/hooks';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { Timeline } from '@dxos/react-ui-components';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { buildExecutionGraph } from './execution-graph';
import { TracePanel } from './TracePanel';

//
// Helpers.
//

const delay = (ms: number) => Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

//
// Simulated agent scenarios.
//

const agentScenarios: { prompt: string; tools: string[] }[] = [
  {
    prompt: 'Create an organization called "Cyberdyne Systems"',
    tools: ['list-schemas', 'create-object'],
  },
  {
    prompt: 'Search for all organizations and persons',
    tools: ['list-schemas', 'query', 'query'],
  },
  {
    prompt: 'Create a person named "John Connor"',
    tools: ['create-object'],
  },
];

/**
 * Write a trace event and yield to the event loop so FeedTraceSink flushes it to ECHO before continuing.
 */
const writeAndFlush = <T,>(eventType: Trace.EventType<T>, payload: T) =>
  Effect.gen(function* () {
    yield* Trace.write(eventType, payload);
    yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 100)));
  });

const SimulatedAgent = Process.make(
  {
    key: 'org.dxos.testing.process.agent',
    input: Schema.Number,
    output: Schema.Void,
    services: [Trace.TraceService],
  },
  (ctx) =>
    Effect.succeed({
      onInput: (scenarioIndex: number) =>
        Effect.gen(function* () {
          const scenario = agentScenarios[scenarioIndex % agentScenarios.length];
          const messageId = ObjectId.random();

          // Agent begins processing.
          yield* writeAndFlush(AgentRequestBegin, {});

          // User message.
          yield* writeAndFlush(CompleteBlock, {
            messageId,
            role: 'user',
            block: { _tag: 'text', text: scenario.prompt },
          });

          // Simulate tool calls sequentially with delays.
          for (const toolName of scenario.tools) {
            const toolCallId = ObjectId.random();

            // Tool call event.
            yield* writeAndFlush(CompleteBlock, {
              messageId,
              role: 'assistant',
              block: { _tag: 'toolCall', toolCallId, name: toolName, input: '{}', providerExecuted: false },
            });

            // Simulate tool execution time.
            yield* delay(1_000 + Math.random() * 3_000);

            // Tool result event.
            yield* writeAndFlush(CompleteBlock, {
              messageId,
              role: 'assistant',
              block: { _tag: 'toolResult', toolCallId, name: toolName, providerExecuted: false },
            });
          }

          // Agent completes.
          yield* writeAndFlush(AgentRequestEnd, {});
          ctx.succeed();
        }).pipe(Effect.orDie),
      onAlarm: () => Effect.void,
      onChildEvent: () => Effect.void,
    }),
);

//
// Story component.
//

const DefaultStory = () => {
  const [space] = useSpaces();
  const runtime = useComputeRuntime(space?.id);
  const invokeCounterRef = useRef(0);

  const handleRunAgent = useCallback(() => {
    if (!runtime) {
      return;
    }
    const scenarioIndex = invokeCounterRef.current++;
    void runtime.runPromise(
      Effect.gen(function* () {
        const manager = yield* ProcessManager.ProcessManagerService;
        const handle = yield* manager.spawn(SimulatedAgent);
        yield* handle.submitInput(scenarioIndex);
      }),
    );
  }, [runtime]);

  if (!space || !runtime) {
    return <Loading />;
  }

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton icon='ph--plus--regular' label='Start Agent' onClick={handleRunAgent} />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <TracePanel role='article' space={space} attendableId={space.id} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/containers/TracePanel',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
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
        AutomationPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Interval (ms) between auto-played trace messages.
 */
const PLAYBACK_INTERVAL_MS = 250;

const SnapshotStory = () => {
  const [space] = useSpaces();
  const [feed] = useQuery(space?.db, FeedTraceSink.query);
  const allMessages = useQuery(
    space?.db,
    feed ? Query.select(Filter.everything()).from(feed) : Query.select(Filter.nothing()),
  );

  // Sort by first event timestamp so playback order is chronological regardless of query ordering.
  const sortedMessages = useMemo(
    () =>
      [...allMessages].sort(
        (left, right) => (left.events[0]?.timestamp ?? 0) - (right.events[0]?.timestamp ?? 0),
      ),
    [allMessages],
  );

  const total = sortedMessages.length;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Start with all messages loaded once the snapshot first arrives; afterwards the user controls `step`.
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && total > 0) {
      hasInitializedRef.current = true;
      setStep(total);
    }
  }, [total]);

  const visibleMessages = useMemo(() => sortedMessages.slice(0, step), [sortedMessages, step]);
  const { commits, branches } = useMemo(
    () => buildExecutionGraph({ traceMessages: visibleMessages }),
    [visibleMessages],
  );
  dbg(commits);

  const stepNext = useCallback(() => setStep((current) => Math.min(current + 1, total)), [total]);
  const stepPrev = useCallback(() => setStep((current) => Math.max(current - 1, 0)), []);
  const reset = useCallback(() => {
    setStep(0);
    setPlaying(false);
  }, []);
  const showAll = useCallback(() => {
    setStep(total);
    setPlaying(false);
  }, [total]);
  const togglePlay = useCallback(() => setPlaying((previous) => !previous), []);

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

  // Keyboard shortcuts: ←/h step back, →/l step forward, space play/pause, r reset, e/End show all.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      switch (event.key) {
        case 'ArrowRight':
        case 'l':
          event.preventDefault();
          stepNext();
          break;
        case 'ArrowLeft':
        case 'h':
          event.preventDefault();
          stepPrev();
          break;
        case ' ':
          event.preventDefault();
          togglePlay();
          break;
        case 'r':
          event.preventDefault();
          reset();
          break;
        case 'e':
        case 'End':
          event.preventDefault();
          showAll();
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stepNext, stepPrev, togglePlay, reset, showAll]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton iconOnly icon='ph--skip-back--regular' label='Reset (R)' onClick={reset} />
          <IconButton iconOnly icon='ph--caret-left--regular' label='Step back (← / H)' onClick={stepPrev} />
          <IconButton
            iconOnly
            icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
            label={playing ? 'Pause (Space)' : 'Play (Space)'}
            onClick={togglePlay}
          />
          <IconButton iconOnly icon='ph--caret-right--regular' label='Step forward (→ / L)' onClick={stepNext} />
          <IconButton iconOnly icon='ph--skip-forward--regular' label='Show all (E / End)' onClick={showAll} />
          <Toolbar.Separator />
          <span className='pli-2 text-sm tabular-nums opacity-70'>
            {step} / {total}
          </span>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Timeline branches={branches} commits={commits} showTimestamp />
      </Panel.Content>
    </Panel.Root>
  );
};

export const WithSnapshot: Story = {
  render: () => <SnapshotStory />,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
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
      ],
    }),
  ],
};
