//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import React, { useMemo } from 'react';

import { Process } from '@dxos/compute';
import { Icon, IconButton, ScrollArea, Tooltip, composable, composableProps } from '@dxos/react-ui';
import { Treegrid, TREEGRID_PATH_SEPARATOR } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';
import { Unit } from '@dxos/util';

const DEFAULT_DEPTH = 1;
/** Extra label inset per nesting level (status icons stay aligned). */
const LABEL_INDENT_REM = 0.5;

/** Nested subprocess rows (level > 1) only surface still-active processes. */
const NESTED_ACTIVE_STATES = new Set<Process.State>([
  Process.State.RUNNING,
  Process.State.HYBERNATING,
  Process.State.TERMINATING,
]);

export type ProcessTreeProps = {
  // TODO(burdon): Atom.
  processes: readonly Process.Info[];
  /**
   * Maximum nesting depth from the root (1 = top-level processes only).
   *
   * @default 1
   */
  depth?: number;
  onProcessSelect?: (process: Process.Info) => void;
  onProcessTerminate?: (process: Process.Info) => void;
};

type ProcessTreeRow = {
  process: Process.Info;
  path: string[];
};

export const ProcessTree = React.memo(
  composable<HTMLDivElement, ProcessTreeProps>(
    ({ processes, depth = DEFAULT_DEPTH, onProcessSelect, onProcessTerminate, ...props }, forwardedRef) => {
      const rows = useMemo(() => buildProcessTreeRows(processes, depth), [processes, depth]);

      return (
        <ScrollArea.Root {...composableProps(props, { classNames: 'dx-expander' })} thin ref={forwardedRef}>
          <ScrollArea.Viewport>
            <Treegrid.Root classNames='grid grid-cols-[min-content_1fr_min-content_min-content]'>
              {rows.map(({ process, path }) => (
                <ProcessTreeRowView
                  key={path.join(TREEGRID_PATH_SEPARATOR)}
                  process={process}
                  path={path}
                  onProcessSelect={onProcessSelect}
                  onProcessTerminate={onProcessTerminate}
                />
              ))}
            </Treegrid.Root>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      );
    },
  ),
);

type ProcessTreeRowViewProps = {
  process: Process.Info;
  path: string[];
  onProcessSelect?: (process: Process.Info) => void;
  onProcessTerminate?: (process: Process.Info) => void;
};

const ProcessTreeRowView = ({ process, path, onProcessSelect, onProcessTerminate }: ProcessTreeRowViewProps) => {
  const duration = Unit.Duration(process.metrics.wallTime);
  const level = path.length;
  const nested = level > 1;

  return (
    <Treegrid.Row
      id={path.join(TREEGRID_PATH_SEPARATOR)}
      classNames={mx('col-span-full grid grid-cols-subgrid gap-2 ps-1', onProcessSelect && 'dx-hover')}
    >
      <Treegrid.Cell classNames='flex items-center gap-0.5'>
        {nested && <Icon icon='ph--arrow-elbow-down-right--regular' size={3} classNames='shrink-0 text-subdued' />}
        <Tooltip.Trigger content={process.state.toString()}>
          <Icon
            size={4}
            synchronized
            classNames={mx(
              process.state === Process.State.RUNNING && 'animate-spin',
              process.state === Process.State.FAILED && 'text-error-text',
              process.state === Process.State.SUCCEEDED && 'text-success-text',
            )}
            icon={Match.value(process.state).pipe(
              Match.when(Process.State.RUNNING, () => 'ph--spinner-gap--regular'),
              Match.when(Process.State.SUCCEEDED, () => 'ph--check-circle--regular'),
              Match.when(Process.State.FAILED, () => 'ph--warning--regular'),
              Match.when(Process.State.HYBERNATING, () => 'ph--spinner--regular'),
              Match.when(Process.State.IDLE, () => 'ph--moon-stars--regular'),
              Match.when(Process.State.TERMINATING, () => 'ph--x-circle--regular'),
              Match.when(Process.State.TERMINATED, () => 'ph--x-circle--regular'),
              Match.orElse(() => 'ph--spinner-gap--regular'),
            )}
          />
        </Tooltip.Trigger>
      </Treegrid.Cell>
      <Treegrid.Cell
        classNames='flex items-center truncate'
        style={nested ? { paddingInlineStart: `${(level - 1) * LABEL_INDENT_REM}rem` } : undefined}
        onClick={() => onProcessSelect?.(process)}
      >
        <span
          className={mx(
            'truncate text-sm',
            level === 1 && 'font-medium',
            process.state !== Process.State.RUNNING && 'text-description',
          )}
        >
          {process.params.name ?? process.pid.toString()}
        </span>
      </Treegrid.Cell>
      <Treegrid.Cell classNames='flex items-center justify-end text-xs text-description tabular-nums'>
        {[Process.State.FAILED, Process.State.SUCCEEDED].includes(process.state) && (
          <span className='whitespace-nowrap'>{duration.toString()}</span>
        )}
      </Treegrid.Cell>
      <Treegrid.Cell>
        {onProcessTerminate && (
          <IconButton
            classNames='min-h-0 p-1'
            icon='ph--x--regular'
            iconOnly
            variant='ghost'
            size={4}
            label='Actions'
            onClick={(event) => {
              event.stopPropagation();
              onProcessTerminate?.(process);
            }}
          />
        )}
      </Treegrid.Cell>
    </Treegrid.Row>
  );
};

const sortProcesses = (processes: readonly Process.Info[]): Process.Info[] => {
  return [
    ...processes.filter((process) => [Process.State.RUNNING, Process.State.HYBERNATING].includes(process.state)),
    ...processes.filter((process) => [Process.State.IDLE].includes(process.state)).slice(0, 3),
    ...processes.filter((process) =>
      [Process.State.SUCCEEDED, Process.State.FAILED, Process.State.TERMINATED].includes(process.state),
    ),
  ].sort((left, right) => {
    const leftCompletedAt = Option.getOrElse(left.completedAt, () => Infinity);
    const rightCompletedAt = Option.getOrElse(right.completedAt, () => Infinity);
    return rightCompletedAt - leftCompletedAt;
  });
};

const sortNestedActive = (processes: readonly Process.Info[]): Process.Info[] =>
  processes
    .filter((process) => NESTED_ACTIVE_STATES.has(process.state))
    .sort((left, right) => {
      const priority = (state: Process.State) =>
        state === Process.State.RUNNING ? 0 : state === Process.State.HYBERNATING ? 1 : 2;
      return priority(left.state) - priority(right.state);
    });

/**
 * Flattens the process forest to a fixed depth. Rows are always shown expanded (no collapse).
 */
const buildProcessTreeRows = (processes: readonly Process.Info[], maxDepth: number): ProcessTreeRow[] => {
  const pidSet = new Set(processes.map((process) => String(process.pid)));
  const childrenByParent = new Map<string, Process.Info[]>();
  const roots: Process.Info[] = [];

  for (const process of processes) {
    const parent = process.parentPid;
    if (parent === null || !pidSet.has(String(parent))) {
      roots.push(process);
      continue;
    }
    const key = String(parent);
    const siblings = childrenByParent.get(key) ?? [];
    siblings.push(process);
    childrenByParent.set(key, siblings);
  }

  const sortedRoots = sortProcesses(roots);

  const rows: ProcessTreeRow[] = [];
  const visit = (process: Process.Info, path: string[], level: number) => {
    if (level > maxDepth) {
      return;
    }
    rows.push({ process, path });
    if (level >= maxDepth) {
      return;
    }
    const children = sortNestedActive(childrenByParent.get(String(process.pid)) ?? []);
    for (const child of children) {
      visit(child, [...path, String(child.pid)], level + 1);
    }
  };

  for (const root of sortedRoots) {
    visit(root, [String(root.pid)], 1);
  }
  return rows;
};
