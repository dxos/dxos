//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Duration from 'effect/Duration';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import { AGENT_PROCESS_KEY } from '@dxos/agent-runtime';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useAtomCapabilityState, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import * as Chat from '@dxos/assistant/Chat';
import * as Process from '@dxos/compute/Process';
import { Annotation, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';
import { ScrollContainer } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { type Commit, Timeline } from '@dxos/react-ui-components';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { ProcessTree, ProcessTreeProps } from '#components';
import { type ExecutionGraph, buildExecutionGraph } from '#execution-graph';
import { getTraceMessagesAtom, useTraceMessages } from '#hooks';
import { AssistantCapabilities } from '#types';

import { type ProcessEnvironment, filterProcesses, parseProcessEnvironments } from './trace-filter';
import { TraceToolbar } from './TraceToolbar';

export type TracePanelProps = AppSurface.SpaceArticleProps<Pick<ProcessTreeProps, 'onProcessTerminate'>>;

export const TracePanel = composable<HTMLDivElement, TracePanelProps>(
  ({ space, attendableId, onProcessTerminate, ...props }, forwardedRef) => {
    const attentionAttrs = useAttentionAttributes(attendableId);
    const { invokePromise } = useOperationInvoker();
    const [settings, updateSettings] = useAtomCapabilityState(AssistantCapabilities.Settings);
    const tracePanelDebug = settings.tracePanelDebug ?? false;
    const environments = useMemo(
      () => parseProcessEnvironments(settings.traceProcessEnvironments),
      [settings.traceProcessEnvironments],
    );
    const handleEnvironmentsChange = useCallback(
      (traceProcessEnvironments: ProcessEnvironment[]) =>
        updateSettings((settings) => ({ ...settings, traceProcessEnvironments })),
      [updateSettings],
    );

    // `useDeferredValue` batches update bursts, works together with `React.memo`.
    // See the comment in `ProcessTreeContainer` for more details.
    const { branches, commits, spanTree, details } = useDeferredValue(useExecutionGraph(space));

    // Debug hatch (dev builds only): expose the raw trace messages (the exact `buildExecutionGraph`
    // input) so a real trace can be captured as a test fixture. While the TracePanel is mounted, run
    // `dxosDumpTrace()` in the console — it copies the serialized `Trace.Message[]` to the clipboard
    // (and logs it). Gated on `import.meta.env.DEV` so it's stripped from production builds.
    const traceMessages = useTraceMessages(space);
    useEffect(() => {
      if (!import.meta.env.DEV) {
        return;
      }
      // Attach a debug hatch to the global object (a genuine global-augmentation boundary).
      const debugGlobal = globalThis as typeof globalThis & { dxosDumpTrace?: () => string };
      debugGlobal.dxosDumpTrace = () => {
        const data = traceMessages.map((message) => ({
          meta: message.meta,
          isEphemeral: message.isEphemeral,
          events: message.events,
        }));
        const json = JSON.stringify(data, null, 2);
        // eslint-disable-next-line no-console
        console.log(json);
        void navigator.clipboard?.writeText(json);
        return `dxosDumpTrace: ${data.length} message(s) copied to clipboard`;
      };
      return () => {
        delete debugGlobal.dxosDumpTrace;
      };
    }, [traceMessages]);

    const [selectedCommit, setSelectedCommit] = useState<Commit | undefined>();
    const handleCommitSelect = useCallback(
      (commit: Commit | undefined) => {
        setSelectedCommit(commit);
        if (commit?.link) {
          const echoUri = EID.tryParse(commit.link);
          const spaceId = echoUri ? EID.getSpaceId(echoUri) : undefined;
          const objectId = echoUri ? EID.getEntityId(echoUri) : undefined;
          if (spaceId && objectId) {
            // TODO(dmaretskyi): Navigates, but fails to open.
            void invokePromise(LayoutOperation.Open, {
              subject: [`${spaceId}:${objectId}`],
            });
          }
        }
      },
      [invokePromise, setSelectedCommit],
    );

    // Select current branch.
    const [currentBranch, setCurrentBranch] = useState<string | null>(null);
    const handleProcessSelect = useCallback(
      (process: Process.Info) => {
        const branch = branches.find((branch) => branch === process.pid.toString());
        if (branch) {
          setCurrentBranch(branch);
        }
      },
      [branches],
    );

    return (
      <div
        {...composableProps(props, {
          ...attentionAttrs,
          classNames: mx(
            'h-full grid divide-y divide-subdued-separator',
            !tracePanelDebug && selectedCommit
              ? 'grid-rows-[min-content_minmax(0,160px)_1fr_minmax(0,206px)]'
              : 'grid-rows-[min-content_minmax(0,160px)_1fr]',
          ),
        })}
        ref={forwardedRef}
      >
        <TraceToolbar selected={environments} onSelectedChange={handleEnvironmentsChange} />

        <ProcessTreeContainer
          space={space}
          environments={environments}
          onProcessSelect={handleProcessSelect}
          onProcessTerminate={onProcessTerminate}
        />

        <ScrollContainer.Root pin>
          <ScrollContainer.Content thin>
            <ScrollContainer.Fade />
            <ScrollContainer.Viewport>
              {tracePanelDebug ? (
                <Syntax.Root data={spanTree}>
                  <Syntax.Content>
                    <Syntax.Viewport>
                      <Syntax.Code classNames='text-xs' />
                    </Syntax.Viewport>
                  </Syntax.Content>
                </Syntax.Root>
              ) : (
                <Timeline
                  compact
                  commits={commits}
                  branches={branches}
                  currentBranch={currentBranch}
                  onSelect={handleCommitSelect}
                />
              )}
            </ScrollContainer.Viewport>
            <ScrollContainer.ScrollDownButton />
          </ScrollContainer.Content>
        </ScrollContainer.Root>

        {!tracePanelDebug && selectedCommit && (
          <Syntax.Root data={details[selectedCommit.id] ?? selectedCommit}>
            <Syntax.Content>
              <Syntax.Viewport>
                <Syntax.Code classNames='text-xs' />
              </Syntax.Viewport>
            </Syntax.Content>
          </Syntax.Root>
        )}
      </div>
    );
  },
);

// Stable ref.
const atomEmpty = Atom.make(() => [] as const);

// How often the graph re-checks for spans that timed out with no closing event.
// Coarse-grained on purpose: `spanTimeoutMs` operates on a 20-minute scale, so there is no
// benefit to re-deriving the graph more often than this just to catch the timeout crossing.
const SPAN_TIMEOUT_CHECK_INTERVAL_MS = 60_000;

type UseExecutionGraphOptions = {
  collapseCompletedSpans?: boolean;
  eventLimit?: number;
};

const useExecutionGraph = (
  space: Space,
  { collapseCompletedSpans, eventLimit }: UseExecutionGraphOptions = {},
): ExecutionGraph => {
  const monitor = useCapability(Capabilities.ProcessMonitor);
  const processesAtom = monitor?.processTreeAtom ?? atomEmpty;

  // Ticks periodically so spans that are still open purely because no new trace event has
  // arrived (e.g. the runtime crashed before writing its `operationEnd`) eventually get
  // force-closed by `buildExecutionGraph`'s `spanTimeoutMs` check, instead of staying stuck
  // until unrelated trace activity happens to trigger a recompute.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), SPAN_TIMEOUT_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const atom = useMemo(
    () => getExecutionGraph(space, processesAtom, { collapseCompletedSpans, eventLimit, now }),
    [space, processesAtom, collapseCompletedSpans, eventLimit, now],
  );

  return useAtomValue(atom);
};

/** Identity for the graph: only a process appearing, disappearing or changing state redraws it. */
const sameProcesses = (left: readonly Process.Info[], right: readonly Process.Info[]): boolean =>
  left.length === right.length &&
  left.every((process, index) => process.pid === right[index].pid && process.state === right[index].state);

const getExecutionGraph = (
  space: Space,
  processesAtom: Atom.Atom<readonly Process.Info[]>,
  { collapseCompletedSpans = true, eventLimit = 100, now }: UseExecutionGraphOptions & { now: number },
): Atom.Atom<ExecutionGraph> => {
  const traceMessages = getTraceMessagesAtom(space);

  const activeProcesses = pipe(
    processesAtom,
    Atom.debounce(Duration.millis(500)),
    Atom.map((processes) =>
      processes.filter(
        (process) => process.state === Process.State.RUNNING || process.state === Process.State.HYBERNATING,
      ),
    ),
    // The monitor rebuilds the process list on every poll, so without a structural comparison the
    // graph would be rebuilt on each tick even when nothing moved.
    Atom.withEquality(sameProcesses),
  );

  return Atom.make((get) =>
    buildExecutionGraph({
      traceMessages: get(traceMessages),
      activeProcesses: get(activeProcesses),
      collapseCompletedSpans,
      eventLimit,
      now,
    }),
  );
};
TracePanel.displayName = 'TracePanel';

type ProcessTreeContainerProps = Pick<ProcessTreeProps, 'onProcessSelect' | 'onProcessTerminate'> & {
  space: Space;
  environments: readonly ProcessEnvironment[];
};

/** Entity id of a feed URI, the join key between a process environment and a chat's feed ref. */
const feedKey = (uri: string): string => {
  const eid = EID.tryParse(uri);
  return (eid && EID.getEntityId(eid)) ?? uri;
};

// Isolate `ProcessTree` updates from the rest of the panel.
// TODO(dmaretskyi): Currently not useful since `useExecutionGraph` also pulls in the updates.
const ProcessTreeContainer = ({
  space,
  environments,
  onProcessSelect,
  onProcessTerminate,
}: ProcessTreeContainerProps) => {
  const monitor = useCapability(Capabilities.ProcessMonitor);
  const processes = useAtomValue(
    useMemo(() => monitor?.processTreeAtom.pipe(Atom.debounce(Duration.millis(500))) ?? atomEmpty, [monitor]),
  );

  // `processes` updates in bursts (about 14 updates per navigation).
  // `useDeferredValue` will debounce update propagation, returning stale value for short periods.
  // NOTE: `ProcessTree` MUST use `React.memo`, otherwise this will not work.
  const processesDeferred = useDeferredValue(processes);
  const visibleProcesses = useMemo(
    () => filterProcesses(processesDeferred, environments),
    [processesDeferred, environments],
  );

  // A process only knows the feed it serves, so the chat's name is joined in here rather than
  // carried on the process itself.
  const chats = useQuery(space.db, Filter.type(Chat.Chat));
  const chatNamesByFeed = useMemo(() => {
    const names = new Map<string, string>();
    for (const chat of chats) {
      const name = chat.name?.trim();
      if (name) {
        names.set(feedKey(chat.feed.uri), name);
      }
    }
    return names;
  }, [chats]);

  // Only the agent process itself is renamed: its children inherit the conversation environment and
  // keep their own operation names.
  const resolveLabel = useCallback(
    (process: Process.Info) => {
      if (process.key !== AGENT_PROCESS_KEY) {
        return undefined;
      }
      const target = Annotation.getDictionary(process.params.annotations, Process.TargetAnnotation).pipe(
        Option.getOrUndefined,
      );
      return target === undefined ? undefined : chatNamesByFeed.get(feedKey(target.toString()));
    },
    [chatNamesByFeed],
  );

  return (
    <ProcessTree
      depth={3}
      processes={visibleProcesses}
      resolveLabel={resolveLabel}
      onProcessSelect={onProcessSelect}
      onProcessTerminate={onProcessTerminate}
    />
  );
};
