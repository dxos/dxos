//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';

import type * as Process from '@dxos/compute/Process';
import {
  Accordion,
  Panel,
  ScrollContainer,
  type ThemedClassName,
  composable,
  composableProps,
  useTranslation,
} from '@dxos/react-ui';
import { ActionToolbar } from '@dxos/react-ui-menu';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { type ExecutionGraph } from '../../execution-graph/index.ts';
import { translationKey } from '../../translations.ts';
import { ProcessTree, type ProcessTreeProps } from '../ProcessTree/index.ts';
import { type Commit, Timeline } from '../Timeline/index.ts';
import { SpanTreeView } from './SpanTreeView.tsx';
import { type ProcessEnvironment, filterProcesses } from './trace-filter.ts';
import { useTraceMenu } from './useTraceMenu.ts';

export type TracePanelProps = ThemedClassName<
  Pick<ProcessTreeProps, 'resolveLabel' | 'selected' | 'onSelectedChange' | 'onProcessTerminate'> & {
    /** The live process tree; narrowed here by `environments`. */
    processes: readonly Process.Info[];
    /** The trace as a commit graph, built by `useExecutionGraph` (already narrowed to `selected`). */
    graph: ExecutionGraph;
    /** Process environments shown; the toolbar's funnel edits it. */
    environments: readonly ProcessEnvironment[];
    onEnvironmentsChange: (environments: ProcessEnvironment[]) => void;
    /** Shows the span tree as JSON in place of the timeline. */
    debug?: boolean;
    /** A commit whose message links an object was picked; the host decides what opening it means. */
    onOpenLink?: (uri: string) => void;
  }
>;

/**
 * A space's runtime: its processes as a tree, its trace as a commit graph, and the picked commit's
 * event. Presentation only — the host resolves the process monitor, the trace feed, settings and
 * navigation and hands them in as props.
 */
export const TracePanel = composable<HTMLDivElement, TracePanelProps>(
  (
    {
      classNames,
      processes,
      graph,
      environments,
      onEnvironmentsChange,
      debug = false,
      resolveLabel,
      selected = NO_SELECTION,
      onSelectedChange,
      onProcessTerminate,
      onOpenLink,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const handleClearSelection = useCallback(() => onSelectedChange?.([]), [onSelectedChange]);
    const menu = useTraceMenu({
      selected: environments,
      onSelectedChange: onEnvironmentsChange,
      selectionCount: selected.length,
      onClearSelection: handleClearSelection,
    });

    // `useDeferredValue` batches update bursts, works together with `React.memo`.
    // See the comment in `ProcessTreeContainer` for more details.
    const { branches, commits, spanTree, details } = useDeferredValue(graph);

    // A commit the graph no longer holds (the process selection moved) is no longer picked.
    const [pickedCommit, setSelectedCommit] = useState<Commit | undefined>();
    const selectedCommit = useMemo(
      () => (pickedCommit && commits.some((commit) => commit.id === pickedCommit.id) ? pickedCommit : undefined),
      [pickedCommit, commits],
    );
    // Remembered across selections, so collapsing a section once keeps it collapsed.
    const [openSections, setOpenSections] = useState<string[]>(SECTIONS.map((section) => section.id));
    // The timeline windows its rows against this scroller.
    const [traceViewport, setTraceViewport] = useState<HTMLDivElement | null>(null);
    const handleCommitSelect = useCallback(
      (commit: Commit | undefined) => {
        setSelectedCommit(commit);
        if (commit?.link) {
          onOpenLink?.(commit.link);
        }
      },
      [onOpenLink],
    );

    // The most recently picked process is the highlighted branch, while it is still picked.
    const currentBranch = useMemo(() => {
      const last = selected.at(-1);
      return last !== undefined && branches.includes(last) ? last : null;
    }, [selected, branches]);

    return (
      <Panel.Root {...composableProps(props, { classNames: ['h-full', classNames] })} ref={forwardedRef}>
        <Panel.Toolbar asChild>
          <ActionToolbar {...menu} alwaysActive classNames='justify-end' />
        </Panel.Toolbar>

        <Panel.Content>
          <Accordion.Root<TraceSection>
            items={SECTIONS}
            value={openSections}
            onValueChange={setOpenSections}
            classNames='h-full min-h-0'
            border={false}
            rounded={false}
          >
            {({ items }) =>
              items.map((section) => {
                switch (section.id) {
                  case 'processes':
                    return (
                      <Accordion.Item key={section.id} item={section}>
                        <Accordion.ItemHeader hover>
                          <span className='text-sm text-description'>{t('trace-processes.label')}</span>
                        </Accordion.ItemHeader>
                        <Accordion.ItemBody classNames='p-0'>
                          <ProcessTreeContainer
                            classNames='max-h-[8lh]'
                            processes={processes}
                            environments={environments}
                            resolveLabel={resolveLabel}
                            selected={selected}
                            onSelectedChange={onSelectedChange}
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
                        disabled
                        classNames={mx(
                          'dx-grow flex flex-col',
                          '[&>[data-part=item-content]]:dx-grow [&>[data-part=item-content]]:flex [&>[data-part=item-content]]:flex-col [&>[data-part=item-content]]:animate-none',
                        )}
                      >
                        <Accordion.ItemHeader hover>
                          <span className='text-sm text-description'>{t('trace.label')}</span>
                        </Accordion.ItemHeader>
                        <Accordion.ItemBody classNames='dx-grow grid grid-rows-[minmax(0,1fr)]'>
                          {/* Opens at the top; the pin arms itself once the reader scrolls to the tail. */}
                          <ScrollContainer.Root>
                            <ScrollContainer.Content thin>
                              <ScrollContainer.Fade classNames='h-8' />
                              <ScrollContainer.Viewport ref={setTraceViewport}>
                                {debug ? (
                                  <SpanTreeView spanTree={spanTree} />
                                ) : (
                                  <Timeline
                                    branches={branches}
                                    branch={currentBranch}
                                    commits={commits}
                                    showTimestamp
                                    scroller={traceViewport}
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
                    const commit = debug ? undefined : selectedCommit;
                    return (
                      // With nothing selected the section stays as a plain, closed row.
                      <Accordion.Item key={section.id} item={section} disabled={!commit}>
                        <Accordion.ItemHeader hover>
                          <span className='flex items-center truncate text-sm text-description'>
                            {t('trace-details.label')}
                          </span>
                        </Accordion.ItemHeader>
                        {commit && (
                          <Accordion.ItemBody classNames='p-0'>
                            <JsonHighlighter
                              data={details[commit.id] ?? commit}
                              classNames='max-h-[20lh] text-xs p-1.5'
                            />
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

TracePanel.displayName = 'TracePanel';

type TraceSection = { id: 'processes' | 'trace' | 'details' };

const SECTIONS: TraceSection[] = [{ id: 'processes' }, { id: 'trace' }, { id: 'details' }];

const NO_SELECTION: readonly string[] = [];

type ProcessTreeContainerProps = ThemedClassName<
  Pick<ProcessTreeProps, 'resolveLabel' | 'selected' | 'onSelectedChange' | 'onProcessTerminate'> & {
    processes: readonly Process.Info[];
    environments: readonly ProcessEnvironment[];
  }
>;

// Isolate `ProcessTree` updates from the rest of the panel.
const ProcessTreeContainer = ({
  classNames,
  processes,
  environments,
  resolveLabel,
  selected,
  onSelectedChange,
  onProcessTerminate,
}: ProcessTreeContainerProps) => {
  // `processes` updates in bursts (about 14 updates per navigation).
  // `useDeferredValue` will debounce update propagation, returning stale value for short periods.
  // NOTE: `ProcessTree` MUST use `React.memo`, otherwise this will not work.
  const processesDeferred = useDeferredValue(processes);
  const visibleProcesses = useMemo(
    () => filterProcesses(processesDeferred, environments),
    [processesDeferred, environments],
  );

  return (
    <ProcessTree
      classNames={classNames}
      depth={3}
      processes={visibleProcesses}
      resolveLabel={resolveLabel}
      selected={selected}
      onSelectedChange={onSelectedChange}
      onProcessTerminate={onProcessTerminate}
    />
  );
};
