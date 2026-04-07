//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { pipe } from 'effect/Function';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Query } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { FeedTraceSink, Process } from '@dxos/functions-runtime';
import { DXN } from '@dxos/keys';
import { dbg, LogLevel } from '@dxos/log';
import { useComputeRuntimeService, useTriggerRuntimeControls } from '@dxos/plugin-automation/hooks';
import { type Space } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Timeline, type Commit } from '@dxos/react-ui-components';

import { AGENT_PROCESS_KEY, CompleteBlock } from '@dxos/assistant';
import { Trace } from '@dxos/functions';
import { SpaceId } from '@dxos/keys';

import { meta } from '#meta';

import { ProcessTree } from '../../components';

export const TracePanel = ({ space }: { space: Space }) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const { state, start, stop } = useTriggerRuntimeControls(space.db);
  const activeProcesses = useActiveProcesses(space.id);
  const isRunning = state?.enabled ?? false;
  const runtime = useComputeRuntimeService(Process.ProcessMonitorService, space.id);

  const { branches, commits } = useAtomValue(
    useMemo(
      () => getExecutionGraph(space, runtime?.processTreeAtom ?? Atom.make(() => [])),
      [space, runtime?.processTreeAtom],
    ),
  );

  const handleCommitClick = useCallback(
    (commit: Commit) => {
      if (commit.link) {
        const dxn = DXN.tryParse(commit.link)?.asEchoDXN();
        if (dxn?.spaceId && dxn.echoId) {
          // TODO(dmaretskyi): Navigates, but fails to open.
          void invokePromise(LayoutOperation.Open, { subject: [`${dxn.spaceId}:${dxn.echoId}`] });
        }
      }
    },
    [invokePromise],
  );

  return (
    <Panel.Root>
      <Panel.Content className='grid grid-rows-[min-content_1fr_min-content]'>
        <ProcessTree
          classNames={['max-h-[8lh] px-2', activeProcesses.length > 0 && 'border-b border-separator']
            .filter(Boolean)
            .join(' ')}
          processes={activeProcesses}
        />
        <Timeline classNames='py-1' branches={branches} commits={commits} compact onCommitClick={handleCommitClick} />
      </Panel.Content>
    </Panel.Root>
  );
};

type InvocationInfo = {
  eventLimit: number;
};

const getExecutionGraph = (
  space: Space,
  processTreeAtom: Atom.Atom<readonly Process.Info[]>,
  { eventLimit = 100 }: { eventLimit?: number } = {},
): Atom.Atom<{
  branches: string[];
  commits: Commit[];
}> => {
  return pipe(
    AtomQuery.make(space.db, FeedTraceSink.query),
    Atom.map((feeds) => {
      // TODO(dmaretskyi): This should be possible in a single query with properly working limit(1) and feed > feed contents traversal.
      return AtomQuery.make(
        space.db,
        feeds.length > 0 ? Query.type(Trace.Message).from(feeds[0]) : Query.select(Filter.nothing()),
      );
    }),
    (_) => Atom.make((get) => get(get(_))),
    (_) =>
      Atom.make((get) => {
        const builder = new GraphBuilder();

        const events = get(_)
          .slice(-eventLimit)
          .flatMap((message) =>
            message.events.map((event: Trace.Event) => ({
              id: message.id,
              meta: message.meta,
              ...event,
            })),
          );

        for (const event of events) {
          if (Trace.isOfType(CompleteBlock, event)) {
            switch (event.data.block._tag) {
              case 'text': {
                if (event.data.role === 'user') {
                  builder.addUserMessage(
                    event.id,
                    event.meta.conversationId ?? 'unknown_conversation',
                    event.data.block.text,
                    event.timestamp,
                  );
                } else {
                  builder.addAssistantMessage(
                    event.id,
                    event.meta.conversationId ?? 'unknown_conversation',
                    event.data.block.text,
                    event.timestamp,
                  );
                }
                break;
              }
              case 'toolCall': {
                builder.addToolCall(
                  `${event.data.block.toolCallId}:call`,
                  event.meta.conversationId ?? 'unknown_conversation',
                  event.data.block.name,
                  event.timestamp,
                );
                break;
              }
              case 'toolResult': {
                builder.addToolResult(
                  `${event.data.block.toolCallId}:result`,
                  event.meta.conversationId ?? 'unknown_conversation',
                  event.data.block.error,
                  event.timestamp,
                );
                break;
              }
            }
          }
        }

        const activeProcesses = get(processTreeAtom);
        for (const process of activeProcesses) {
          if (
            process.key === AGENT_PROCESS_KEY &&
            process.params.target &&
            (process.state === Process.State.RUNNING || process.state === Process.State.HYBERNATING)
          ) {
            const conversationId = DXN.parse(process.params.target).asEchoDXN()?.echoId;
            if (conversationId) {
              builder.addRunningAgent(process.pid, conversationId, Date.now());
            }
          }
        }
        return builder.build();
      }),
  );
};

// Stable ref.
const atomEmpty = Atom.make(() => [] as const);

const useActiveProcesses = (id?: SpaceId) => {
  const runtime = useComputeRuntimeService(Process.ProcessMonitorService, id);
  return useAtomValue(runtime?.processTreeAtom ?? atomEmpty);
};

class GraphBuilder {
  #commits: Commit[] = [];
  #branches = new Set<string>();
  #lastCommitByBranch = new Map<string, string>();

  #addCommit(commit: Commit) {
    this.#branches.add(commit.branch);
    this.#commits.push(commit);
    this.#lastCommitByBranch.set(commit.branch, commit.id);
  }

  #defaultParents(branch: string) {
    return this.#lastCommitByBranch.get(branch) ? [this.#lastCommitByBranch.get(branch)!] : [];
  }

  build() {
    return {
      commits: this.#commits,
      branches: [...this.#branches],
    };
  }

  addUserMessage(id: string, coversationId: string, text: string, ts: number) {
    this.#addCommit({
      id,
      branch: coversationId,
      parents: this.#defaultParents(coversationId),
      icon: 'ph--paper-plane-right--regular',
      level: LogLevel.VERBOSE,
      message: text.slice(0, 100),
      timestamp: new Date(ts),
    });
  }

  addAssistantMessage(id: string, coversationId: string, text: string, ts: number) {
    this.#addCommit({
      id,
      branch: coversationId,
      parents: this.#defaultParents(coversationId),
      icon: 'ph--robot--regular',
      level: LogLevel.VERBOSE,
      message: text.slice(0, 100),
      timestamp: new Date(ts),
    });
  }

  addToolCall(id: string, coversationId: string, toolName: string, ts: number) {
    this.#addCommit({
      id,
      branch: coversationId,
      parents: this.#defaultParents(coversationId),
      icon: 'ph--wrench--regular',
      level: LogLevel.INFO,
      message: toolName,
      timestamp: new Date(ts),
    });
  }

  addToolResult(id: string, coversationId: string, error: string | undefined, ts: number) {
    this.#addCommit({
      id,
      branch: coversationId,
      parents: this.#defaultParents(coversationId),
      icon: error ? 'ph--x-circle--regular' : 'ph--check-circle--regular',
      level: error ? LogLevel.ERROR : LogLevel.INFO,
      message: error ? `Error: ${error}` : 'Success',
      timestamp: new Date(ts),
    });
  }

  addRunningAgent(pid: string, conversationId: string, ts: number) {
    this.#addCommit({
      id: pid,
      branch: conversationId,
      parents: this.#defaultParents(conversationId),
      icon: 'ph--spinner-gap--regular',
      level: LogLevel.INFO,
      message: 'Generating...',
      timestamp: new Date(ts),
    });
  }
}
