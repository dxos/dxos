//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Option from 'effect/Option';
import React, { useEffect, useMemo, useState } from 'react';

import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import { Annotation, Obj } from '@dxos/echo';
import { URI } from '@dxos/keys';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { buildExecutionGraph } from '../../execution-graph/index.ts';
import { makeProcess, subAgentDelegationFixture } from '../../testing/index.ts';
import { translations } from '../../translations.ts';
import { ALL_PROCESS_ENVIRONMENTS, type ProcessEnvironment, filterTraceMessages } from './trace-filter.ts';
import { TracePanel, type TracePanelProps } from './TracePanel.tsx';

// Raw Trace.Message[] captured from a live sub-agent delegation via `dxosDumpTrace()`. External
// JSON -> typed at this boundary; `buildExecutionGraph` only reads `meta`/`events`.
const messages = (subAgentDelegationFixture as unknown as Trace.Message[])
  .slice()
  .sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.events[0]?.timestamp ?? 0));

/** One process per top-level pid in the fixture, so the tree has something to pick. */
const processes: Process.Process[] = [...new Set(messages.map((message) => message.meta.pid))]
  .filter((pid): pid is string => pid !== undefined)
  .map((pid, index) => {
    const own = messages.filter((message) => message.meta.pid === pid);
    const parentPid = own[0]?.meta.parentPid;
    const name = own[0]?.meta.processName ?? `Process ${index + 1}`;
    // The fixture's one agent: the other top-level pid is the chat-naming operation the UI ran.
    const isAgent = parentPid === undefined && name === 'Agent';
    return makeProcess({
      pid: Process.ID.make(pid),
      parentPid: parentPid === undefined ? null : Process.ID.make(parentPid),
      name,
      state: Process.State.SUCCEEDED,
      startedAt: own[0]?.events[0]?.timestamp ?? 0,
      completedAt: Option.some(own.at(-1)?.events.at(-1)?.timestamp ?? 0),
      metrics: { wallTime: 1_200 * (index + 1), inputCount: 1, outputCount: 1 },
      params: {
        name,
        annotations: Annotation.buildDictionary((dictionary) => {
          if (isAgent) {
            Annotation.setDictionary(dictionary, Process.HarnessHostAnnotation, true);
            Annotation.setDictionary(dictionary, Process.TargetAnnotation, URI.make('dxn:echo:@:chat'));
          }
        }),
      },
    });
  });

type StoryProps = Pick<TracePanelProps, 'debug'>;

/** The story holds what the app's container would: the selection, the environment filter, the graph. */
const DefaultStory = ({ debug }: StoryProps) => {
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [environments, setEnvironments] = useState<readonly ProcessEnvironment[]>(ALL_PROCESS_ENVIRONMENTS);
  const graph = useMemo(
    () => buildExecutionGraph({ traceMessages: filterTraceMessages(messages, selected), activeProcesses: [] }),
    [selected],
  );

  return (
    <TracePanel
      processes={processes}
      graph={graph}
      environments={environments}
      onEnvironmentsChange={setEnvironments}
      debug={debug}
      selected={selected}
      onSelectedChange={setSelected}
      resolveLabel={(process) => (Process.isHarnessHost(process) ? 'Agent (sub-agent delegation)' : undefined)}
      onProcessTerminate={() => {}}
      onOpenLink={(uri) => {
        // eslint-disable-next-line no-console
        console.log('open', uri);
      }}
    />
  );
};

/** Batches per invocation of a capped mail sync; every invocation but the last calls `Operation.runAgain()`. */
const CHAIN_BATCHES = [3, 3, 2];

/**
 * A `runAgain` chain as the trigger dispatcher traces it: one process per batch, each continuation carrying
 * the first invocation's pid as `runId`. Each entry says when (ms after load) the message lands.
 */
const chainMessages = (start: number): { at: number; message: Trace.Message }[] => {
  const entries: { at: number; message: Trace.Message }[] = [];
  let at = 1_000;
  CHAIN_BATCHES.forEach((pages, index) => {
    const pid = `sync-${index + 1}`;
    const meta: Trace.Meta = { pid, processName: 'Sync', ...(index === 0 ? {} : { runId: 'sync-1' }) };
    const push = (type: string, data: unknown) =>
      entries.push({
        at,
        message: Obj.make(Trace.Message, { meta, isEphemeral: false, events: [{ type, timestamp: start + at, data }] }),
      });
    push(Trace.OperationStart.key, { key: 'sync', name: 'Sync' });
    for (let page = 1; page <= pages; page++) {
      at += 700;
      push(Trace.CompleteBlock.key, {
        messageId: `${pid}-${page}`,
        role: 'assistant',
        block: { _tag: 'status', statusText: `Batch ${index + 1}: page ${page}`, pending: false },
      });
    }
    at += 500;
    push(
      Trace.OperationEnd.key,
      index === CHAIN_BATCHES.length - 1
        ? { key: 'sync', name: 'Sync', outcome: 'success' }
        : {
            key: 'sync',
            name: 'Sync',
            outcome: 'failure',
            error: Process.RUN_AGAIN_MESSAGE,
            errorCode: Process.RUN_AGAIN_ERROR_CODE,
          },
    );
    at += 1_500;
  });
  return entries;
};

/** Replays {@link chainMessages} into the panel, with each invocation's process running until it ends. */
const RunAgainChainStory = () => {
  const [entries] = useState(() => chainMessages(Date.now()));
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timers = entries.map((entry, index) => setTimeout(() => setCount(index + 1), entry.at));
    return () => timers.forEach(clearTimeout);
  }, [entries]);

  const [selected, setSelected] = useState<readonly string[]>([]);
  const [environments, setEnvironments] = useState<readonly ProcessEnvironment[]>(ALL_PROCESS_ENVIRONMENTS);
  const shown = useMemo(() => entries.slice(0, count).map((entry) => entry.message), [entries, count]);
  const chainProcesses = useMemo(
    () =>
      [...new Set(shown.map((message) => message.meta.pid))]
        .filter((pid): pid is string => pid !== undefined)
        .map((pid) => {
          const own = shown.filter((message) => message.meta.pid === pid);
          const ended = own.some((message) => message.events.some((event) => event.type === Trace.OperationEnd.key));
          return makeProcess({
            pid: Process.ID.make(pid),
            parentPid: null,
            name: 'Sync',
            state: ended ? Process.State.SUCCEEDED : Process.State.RUNNING,
            startedAt: own[0]?.events[0]?.timestamp ?? 0,
          });
        }),
    [shown],
  );
  const graph = useMemo(
    () =>
      buildExecutionGraph({
        traceMessages: filterTraceMessages(shown, selected),
        activeProcesses: chainProcesses.filter((process) => process.state === Process.State.RUNNING),
      }),
    [shown, selected, chainProcesses],
  );

  return (
    <div className='contents' data-testid='run-again-chain'>
      <TracePanel
        processes={chainProcesses}
        graph={graph}
        environments={environments}
        onEnvironmentsChange={setEnvironments}
        selected={selected}
        onSelectedChange={setSelected}
        onProcessTerminate={() => {}}
        onOpenLink={() => {}}
      />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-trace/TracePanel',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-(--dx-complementary-sidebar-size)' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<StoryProps>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * A captured sub-agent delegation: the supervisor, its tool calls and the spawned sub-agent, as the
 * process tree and the commit graph. Click a process to narrow the trace to it; Cmd-click adds one.
 */
export const Default: Story = { args: {} };

/** The span tree the graph was built from, in place of the timeline. */
export const Debug: Story = {
  args: { debug: true },
};

/**
 * A sync that continues with `Operation.runAgain()` across three batches, replayed from the start on every
 * load: the commit graph draws the batches as one run.
 */
export const RunAgainChain: Story = {
  render: () => <RunAgainChainStory />,
};
