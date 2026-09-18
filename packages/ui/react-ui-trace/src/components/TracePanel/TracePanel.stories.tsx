//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Option from 'effect/Option';
import React, { useMemo, useState } from 'react';

import * as Process from '@dxos/compute/Process';
import type * as Trace from '@dxos/compute/Trace';
import { Annotation } from '@dxos/echo';
import { URI } from '@dxos/keys';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { buildExecutionGraph } from '../../execution-graph/index.ts';
import { makeProcess, subAgentDelegationFixture } from '../../testing/index.ts';
import { translations } from '../../translations.ts';
import { ALL_PROCESS_ENVIRONMENTS, type ProcessEnvironment, filterTraceMessages } from './trace-filter.ts';
import { TracePanel, type TracePanelProps } from './TracePanel.tsx';

// Raw Trace.Message[] captured from a live sub-agent delegation via `dxosDumpTrace()`. External
// JSON → typed at this boundary; `buildExecutionGraph` only reads `meta`/`events`.
const messages = (subAgentDelegationFixture as unknown as Trace.Message[])
  .slice()
  .sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.events[0]?.timestamp ?? 0));

/** One process per top-level pid in the fixture, so the tree has something to pick. */
const processes: Process.Info[] = [...new Set(messages.map((message) => message.meta.pid))]
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
 * process tree and the commit graph. Click a process to narrow the trace to it; ⌘-click adds one.
 */
export const Default: Story = { args: {} };

/** The span tree the graph was built from, in place of the timeline. */
export const Debug: Story = {
  args: { debug: true },
};
