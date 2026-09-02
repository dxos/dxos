//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import React, { useCallback, useContext, useMemo, useRef } from 'react';

import * as Process from '@dxos/compute/Process';
import { Icon, IconButton, ScrollArea, Tooltip, composable, composableProps } from '@dxos/react-ui';
import { type ColumnRenderer, type IconRenderer, Tree, createStaticTreeModel } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';
import { Unit } from '@dxos/util';

const DEFAULT_DEPTH = 1;
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

/** Node of the pruned process forest handed to the tree model. */
type ProcessNode = {
  id: string;
  /** Absent on the synthetic root, which anchors the top-level processes and is never rendered. */
  process?: Process.Info;
  children: ProcessNode[];
};

/** Synthetic root; the tree renders its children, never the root itself. */
const ROOT_ID = 'processes';

export const ProcessTree = React.memo(
  composable<HTMLDivElement, ProcessTreeProps>(
    ({ processes, depth = DEFAULT_DEPTH, onProcessSelect, onProcessTerminate, ...props }, forwardedRef) => {
      // Open state lives outside the model: `processes` carries live metrics, so the forest (and with
      // it the model) is rebuilt on every tick, and a collapse held only inside the model would be
      // undone by the next one.
      const openRef = useRef(new Map<string, boolean>());
      const registry = useContext(RegistryContext);
      const root = useMemo(() => buildProcessForest(processes, depth), [processes, depth]);

      const model = useMemo(
        () =>
          createStaticTreeModel<ProcessNode>(root, {
            getChildren: (node) => node.children,
            getProps: (node) => ({
              label: node.process?.params.name ?? node.id,
            }),
            // Expanded by default, matching the flattened view this replaced.
            isOpen: (_node, path) => openRef.current.get(path.join('/')) ?? true,
          }),
        [root],
      );

      // The ref survives model rebuilds; the atom is what the controlled tree actually reads, so a
      // toggle has to land in both.
      const handleOpenChange = useCallback(
        ({ path, open }: { path: string[]; open: boolean }) => {
          openRef.current.set(path.join('/'), open);
          const atom = model.stateAtom(path);
          registry.set(atom, { ...registry.get(atom), open });
        },
        [model, registry],
      );

      const handleSelect = useCallback(
        ({ item }: { item: ProcessNode }) => item.process && onProcessSelect?.(item.process),
        [onProcessSelect],
      );

      const renderIcon = useMemo(() => makeIconRenderer(), []);
      const renderColumns = useMemo(() => makeColumnRenderer(onProcessTerminate), [onProcessTerminate]);

      return (
        <ScrollArea.Root {...composableProps(props, { classNames: 'dx-expand' })} thin ref={forwardedRef}>
          <ScrollArea.Viewport>
            <Tree<ProcessNode>
              id={ROOT_ID}
              model={model}
              gridTemplateColumns='[tree-row-start] minmax(0, 1fr) min-content min-content [tree-row-end]'
              renderIcon={renderIcon}
              renderColumns={renderColumns}
              onOpenChange={handleOpenChange}
              onSelect={handleSelect}
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      );
    },
  ),
);

/** Status glyph — animated, coloured and tooltipped per state, which `TreeItemDataProps.icon` cannot express. */
const makeIconRenderer =
  (): IconRenderer<ProcessNode> =>
  ({ item: { process } }) =>
    process === undefined ? null : (
      <Tooltip.Trigger content={process.state.toString()}>
        <Icon
          size={4}
          synchronized
          classNames={mx(
            'shrink-0',
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
    );

/** Trailing columns: elapsed time for finished processes, and the terminate control. */
const makeColumnRenderer =
  (onProcessTerminate?: (process: Process.Info) => void): ColumnRenderer<ProcessNode> =>
  ({ item: { process } }) =>
    process === undefined ? null : (
      <>
        <div className='flex items-center justify-end text-xs text-description tabular-nums'>
          {[Process.State.FAILED, Process.State.SUCCEEDED].includes(process.state) && (
            <span className='whitespace-nowrap'>{Unit.Duration(process.metrics.wallTime).toString()}</span>
          )}
        </div>
        <div className='flex items-center'>
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
                onProcessTerminate(process);
              }}
            />
          )}
        </div>
      </>
    );

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
 * Builds the process forest, pruned to `maxDepth` from each root. Nested levels surface only still-
 * active processes, so a deep tree stays readable while completed work collapses out of view.
 */
const buildProcessForest = (processes: readonly Process.Info[], maxDepth: number): ProcessNode => {
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

  const visit = (process: Process.Info, level: number): ProcessNode => {
    const children = level >= maxDepth ? [] : sortNestedActive(childrenByParent.get(String(process.pid)) ?? []);
    return {
      id: String(process.pid),
      process,
      children: children.map((child) => visit(child, level + 1)),
    };
  };

  return {
    id: ROOT_ID,
    children: sortProcesses(roots).map((process) => visit(process, 1)),
  };
};
