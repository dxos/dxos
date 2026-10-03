//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import React, { useCallback, useContext, useMemo, useRef } from 'react';

import * as Process from '@dxos/compute/Process';
import { Tree, type TreeNode, type TreeSelectEvent, createStaticTreeModel } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import * as Util from '@dxos/react-ui/Util';
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
  /**
   * Overrides the row label for a process (e.g. the name of the chat it is serving), falling back to
   * the process name when it returns `undefined`.
   *
   * Must be referentially stable — `ProcessTree` is memoized on its props.
   */
  resolveLabel?: (process: Process.Info) => string | undefined;
  /** Pids drawn as selected; the tree is controlled, so a click reports through `onSelectedChange`. */
  selected?: readonly string[];
  /** The selection after a click: the clicked pid alone, or toggled among the others on a meta-click. */
  onSelectedChange?: (selected: string[]) => void;
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

const NO_SELECTION: readonly string[] = [];

/**
 * The agent's running processes as a tree, one row per process with its status glyph and metrics
 * in trailing columns. The forest is rebuilt on every metrics tick, so open state lives outside the
 * model and is re-seeded — a collapse must survive the next tick. Renders through `Tree`.
 */
export const ProcessTree = React.memo(
  Util.composable<HTMLDivElement, ProcessTreeProps>(
    (
      {
        processes,
        depth = DEFAULT_DEPTH,
        resolveLabel,
        selected = NO_SELECTION,
        onSelectedChange,
        onProcessTerminate,
        ...props
      },
      forwardedRef,
    ) => {
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
              label: (node.process && resolveLabel?.(node.process)) ?? node.process?.params.name ?? node.id,
            }),
            // Expanded by default, matching the flattened view this replaced.
            isOpen: (_node, path) => openRef.current.get(path.join('/')) ?? true,
            isCurrent: (node) => node.process !== undefined && selected.includes(node.process.pid),
          }),
        [root, resolveLabel, selected],
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
        ({ item, current, meta }: TreeSelectEvent<ProcessNode>) => {
          if (!item.process) {
            return;
          }
          const pid = item.process.pid.toString();
          onSelectedChange?.(
            !meta ? [pid] : current ? [...selected, pid] : selected.filter((candidate) => candidate !== pid),
          );
        },
        [selected, onSelectedChange],
      );

      const renderRow = useCallback(
        (node: TreeNode<ProcessNode>) => <ProcessRow node={node} onProcessTerminate={onProcessTerminate} />,
        [onProcessTerminate],
      );

      return (
        <div {...Util.composableProps(props, { classNames: 'flex flex-col min-h-0' })} ref={forwardedRef}>
          <Tree.Root
            id={ROOT_ID}
            model={model}
            virtual='fixed'
            size='sm'
            selectionMode='multiple'
            columns={COLUMNS}
            onOpenChange={handleOpenChange}
            onSelect={handleSelect}
          >
            <Tree.Content>{renderRow}</Tree.Content>
          </Tree.Root>
        </div>
      );
    },
  ),
);

/** Disclosure, status glyph, label, then the elapsed time and the terminate control. */
const COLUMNS = 'var(--dx-half-block-size) var(--dx-block-size) minmax(0, 1fr) min-content min-content';

type ProcessRowProps = {
  node: TreeNode<ProcessNode>;
  onProcessTerminate?: (process: Process.Info) => void;
};

/** One process: its status glyph (animated, coloured and tooltipped per state), elapsed time and terminate control. */
const ProcessRow = ({ node, onProcessTerminate }: ProcessRowProps) => {
  const process = node.item?.process;
  return (
    <Tree.Item node={node}>
      <Tree.ItemIndicator />
      <Tree.ItemIcon>{process && <StatusIcon process={process} />}</Tree.ItemIcon>
      <Tree.ItemText />
      <span className='text-end ps-1 text-xs text-fg-muted tabular-nums whitespace-nowrap'>
        {process &&
          [Process.State.FAILED, Process.State.SUCCEEDED].includes(process.state) &&
          Unit.Duration(process.metrics.wallTime).toString()}
      </span>
      <span>
        {process && onProcessTerminate && process.state !== Process.State.TERMINATED && (
          <Button.Button
            icon='ph--x--regular'
            iconOnly
            size='sm'
            variant='ghost'
            label='Actions'
            onClick={(event) => {
              event.stopPropagation();
              onProcessTerminate(process);
            }}
          />
        )}
      </span>
    </Tree.Item>
  );
};

const StatusIcon = ({ process }: { process: Process.Info }) => (
  <Tooltip.Trigger content={process.state.toString()}>
    <Icon.Icon
      size='md'
      spin={process.state === Process.State.RUNNING}
      valence={
        process.state === Process.State.FAILED
          ? 'error'
          : process.state === Process.State.SUCCEEDED
            ? 'success'
            : undefined
      }
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
