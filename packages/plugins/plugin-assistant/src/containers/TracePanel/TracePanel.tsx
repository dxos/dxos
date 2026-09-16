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
import {
  Accordion,
  Panel,
  ScrollContainer,
  ThemedClassName,
  composable,
  composableProps,
  useTranslation,
} from '@dxos/react-ui';
import { useAttentionAttributes, useSelection, useSelectionActions } from '@dxos/react-ui-attention';
import { type Commit, Timeline } from '@dxos/react-ui-components';
import { ActionToolbar } from '@dxos/react-ui-menu';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { ProcessTree, ProcessTreeProps } from '#components';
import { type ExecutionGraph, buildExecutionGraph } from '#execution-graph';
import { getTraceMessagesAtom, useTraceMessages } from '#hooks';
import { meta } from '#meta';
import { AssistantCapabilities } from '#types';

import {
  type ProcessEnvironment,
  filterProcesses,
  filterTraceMessages,
  parseProcessEnvironments,
} from './trace-filter.ts';
import { useTraceMenu } from './useTraceMenu.ts';

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

    // The picked processes live in view state keyed by the panel, so they survive a remount; the
    // trace below narrows to them and their children.
    const selectedPids = useSelection(attendableId, 'multi');
    const { toggle: toggleSelected, clear: clearSelected } = useSelectionActions(attendableId);

    const menu = useTraceMenu({
      selected: environments,
      onSelectedChange: handleEnvironmentsChange,
      selectionCount: selectedPids.length,
      onClearSelection: clearSelected,
    });
    const { t } = useTranslation(meta.profile.key);

    // `useDeferredValue` batches update bursts, works together with `React.memo`.
    // See the comment in `ProcessTreeContainer` for more details.
    const { branches, commits, spanTree, details } = useDeferredValue(useExecutionGraph(space, { selectedPids }));

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
    // Remembered across selections, so collapsing a section once keeps it collapsed.
    const [openSections, setOpenSections] = useState<string[]>(SECTIONS.map((section) => section.id));
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

    // The most recently picked process is the highlighted branch, while it is still picked.
    const currentBranch = useMemo(() => {
      const last = selectedPids.at(-1);
      return last !== undefined && branches.includes(last) ? last : null;
    }, [selectedPids, branches]);
    const handleProcessSelect = useCallback(
      (process: Process.Info) => toggleSelected(process.pid.toString()),
      [toggleSelected],
    );

    return (
      <Panel.Root {...composableProps(props, { ...attentionAttrs, classNames: 'h-full' })} ref={forwardedRef}>
        <Panel.Toolbar asChild>
          <ActionToolbar {...menu} alwaysActive classNames='justify-end' />
        </Panel.Toolbar>

        <Panel.Content>
          <Accordion.Root<TraceSection>
            items={SECTIONS}
            value={openSections}
            onValueChange={setOpenSections}
            classNames='h-full min-h-0 rounded-none border-y-0'
          >
            {({ items }) =>
              items.map((section) => {
                switch (section.id) {
                  case 'processes':
                    return (
                      // TODO(burdon): Select process to show details.
                      <Accordion.Item key={section.id} item={section} classNames='border-x-0'>
                        <Accordion.ItemHeader hover>
                          <span className='text-sm text-description'>{t('trace-processes.label')}</span>
                        </Accordion.ItemHeader>
                        <Accordion.ItemBody classNames='p-0'>
                          <ProcessTreeContainer
                            classNames='max-h-[8lh]'
                            space={space}
                            environments={environments}
                            selected={selectedPids}
                            onProcessSelect={handleProcessSelect}
                            onProcessTerminate={onProcessTerminate}
                          />
                        </Accordion.ItemBody>
                      </Accordion.Item>
                    );
                  case 'trace':
                    return (
                      // The trace takes the slack: item and body are flex columns so the scroll
                      // container inside gets a definite height to scroll within. The body's slide
                      // animation is off here — it ramps to a measured height, and this body's height
                      // comes from the flex slack, not its content.
                      <Accordion.Item
                        key={section.id}
                        item={section}
                        classNames={mx(
                          'border-x-0 dx-grow flex flex-col',
                          '[&>[data-part=item-content]]:dx-grow [&>[data-part=item-content]]:flex [&>[data-part=item-content]]:flex-col [&>[data-part=item-content]]:animate-none',
                        )}
                      >
                        <Accordion.ItemHeader hover>
                          <span className='text-sm text-description'>{t('trace.label')}</span>
                        </Accordion.ItemHeader>
                        <Accordion.ItemBody classNames='dx-grow grid grid-rows-[minmax(0,1fr)]'>
                          <ScrollContainer.Root pin>
                            <ScrollContainer.Content thin>
                              <ScrollContainer.Fade />
                              <ScrollContainer.Viewport>
                                {tracePanelDebug ? (
                                  <JsonHighlighter data={spanTree} classNames='text-xs' />
                                ) : (
                                  <Timeline
                                    branches={branches}
                                    branch={currentBranch}
                                    commits={commits}
                                    showTimestamp
                                    onSelect={handleCommitSelect}
                                  />
                                )}
                              </ScrollContainer.Viewport>
                              <ScrollContainer.ScrollDownButton />
                            </ScrollContainer.Content>
                          </ScrollContainer.Root>
                        </Accordion.ItemBody>
                      </Accordion.Item>
                    );
                  case 'details': {
                    const commit = tracePanelDebug ? undefined : selectedCommit;
                    return (
                      // With nothing selected the section stays as a plain, closed row.
                      <Accordion.Item key={section.id} item={section} disabled={!commit} classNames='border-x-0'>
                        <Accordion.ItemHeader hover>
                          <span className='block truncate text-sm text-description'>
                            {commit?.message ?? t('trace-details.label')}
                          </span>
                        </Accordion.ItemHeader>
                        {commit && (
                          <Accordion.ItemBody classNames='p-0'>
                            <JsonHighlighter data={details[commit.id] ?? commit} classNames='max-h-[20lh] text-xs' />
                          </Accordion.ItemBody>
                        )}
                      </Accordion.Item>
                    );
                  }
                }
              })
            }
          </Accordion.Root>
        </Panel.Content>
      </Panel.Root>
    );
  },
);

type TraceSection = { id: 'processes' | 'trace' | 'details' };

const SECTIONS: TraceSection[] = [{ id: 'processes' }, { id: 'trace' }, { id: 'details' }];

// Stable refs.
const atomEmpty = Atom.make(() => [] as const);
const NO_PIDS: readonly string[] = [];

// How often the graph re-checks for spans that timed out with no closing event.
// Coarse-grained on purpose: `spanTimeoutMs` operates on a 20-minute scale, so there is no
// benefit to re-deriving the graph more often than this just to catch the timeout crossing.
const SPAN_TIMEOUT_CHECK_INTERVAL_MS = 60_000;

type UseExecutionGraphOptions = {
  collapseCompletedSpans?: boolean;
  eventLimit?: number;
  /** Pids to narrow the graph to (with their descendants); empty shows everything. */
  selectedPids?: readonly string[];
};

const useExecutionGraph = (
  space: Space,
  { collapseCompletedSpans, eventLimit, selectedPids = NO_PIDS }: UseExecutionGraphOptions = {},
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
    () => getExecutionGraph(space, processesAtom, { collapseCompletedSpans, eventLimit, selectedPids, now }),
    [space, processesAtom, collapseCompletedSpans, eventLimit, selectedPids, now],
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
  {
    collapseCompletedSpans = true,
    eventLimit = 100,
    selectedPids = NO_PIDS,
    now,
  }: UseExecutionGraphOptions & { now: number },
): Atom.Atom<ExecutionGraph> => {
  const traceMessages = getTraceMessagesAtom(space).pipe(
    Atom.map((messages) => filterTraceMessages(messages, selectedPids)),
  );

  const activeProcesses = pipe(
    processesAtom,
    Atom.debounce(Duration.millis(500)),
    Atom.map((processes) =>
      processes.filter(
        (process) =>
          (process.state === Process.State.RUNNING || process.state === Process.State.HYBERNATING) &&
          (selectedPids.length === 0 || selectedPids.includes(process.pid)),
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

/** Entity id of a feed URI, the join key between a process environment and a chat's feed ref. */
const feedKey = (uri: string): string => {
  const eid = EID.tryParse(uri);
  return (eid && EID.getEntityId(eid)) ?? uri;
};

type ProcessTreeContainerProps = ThemedClassName<
  Pick<ProcessTreeProps, 'selected' | 'onProcessSelect' | 'onProcessTerminate'> & {
    space: Space;
    environments: readonly ProcessEnvironment[];
  }
>;

// Isolate `ProcessTree` updates from the rest of the panel.
// TODO(dmaretskyi): Currently not useful since `useExecutionGraph` also pulls in the updates.
const ProcessTreeContainer = ({
  classNames,
  space,
  environments,
  selected,
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
      classNames={classNames}
      depth={3}
      processes={visibleProcesses}
      resolveLabel={resolveLabel}
      selected={selected}
      onProcessSelect={onProcessSelect}
      onProcessTerminate={onProcessTerminate}
    />
  );
};
