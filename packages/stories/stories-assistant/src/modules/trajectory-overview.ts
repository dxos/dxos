//
// Copyright 2026 DXOS.org
//

import type * as Reducer from '@dxos/compute/Reducer';
import type * as Trajectory from '@dxos/compute/Trajectory';
import { LogLevel } from '@dxos/log';
import { type Commit } from '@dxos/react-ui-trace';

/** The trunk: the session itself, with the tasks it finished. */
export const TRUNK = 'main';

/** The branch that holds prompts no thread has taken yet. */
export const QUEUE = 'queued';

/** The tool a turn delegates a subagent with; its result names the subagent's thread. */
const THREAD_DELEGATE = 'thread_delegate';

/** The `Timeline` tag that shimmers a row, which marks work in progress or still to come. */
const SHIMMER = 'effect:shimmer';

export type OverviewOptions = {
  /** How many finished tasks the trunk shows; earlier ones are only counted. */
  readonly history?: number;
  /**
   * The session state, which tells a fork at rest between its turns (open until a person merges it) from a merged
   * one; the thread view marks both done. Without it, every fork that is not running counts as finished.
   */
  readonly session?: Reducer.SessionState;
};

/** A unit of work the graph shows: what a lane was asked to do. */
type Task = { readonly id: string; readonly title: string; readonly created: string };

/**
 * What the agent is doing, at a glance: the trunk lists the tasks it finished, a branch per thread still running (a
 * subagent branches off the thread that delegated it) lists the tasks that thread took on and what it does now, and
 * a last branch lists the prompts still queued. Messages and tool calls never show; a finished thread collapses into
 * one commit on the trunk (or on the thread that delegated it, while that one runs).
 */
export const toOverview = (view: Reducer.ThreadView, { history = 5, session }: OverviewOptions = {}): Commit[] => {
  const lanes = new Map(view.lanes.map((lane) => [lane.id, lane]));
  const openForks = new Set(
    (session?.threads ?? []).flatMap((thread) =>
      thread.mode === 'fork' && thread.status === 'open' ? [thread.id] : [],
    ),
  );
  /** Unmerged: running or waiting, or a fork no one has merged yet. */
  const isOpen = (lane: Reducer.Lane) => isRunning(lane) || openForks.has(lane.id);
  const delegator = delegators(view, lanes);
  const children = new Map<Trajectory.ThreadId, Reducer.Lane[]>();
  for (const lane of view.lanes) {
    const parent = delegator.get(lane.id);
    if (parent !== undefined) {
      children.set(parent, [...(children.get(parent) ?? []), lane]);
    }
  }
  const tasksOf = (lane: Reducer.Lane): Task[] => {
    const requests = view.items.filter(
      (item) => item.lane === lane.id && item.sender.role === 'user' && item.status === 'consumed',
    );
    return requests.flatMap((item, index): Task[] => {
      const text = textOf(item.blocks);
      // The first request is the lane's own, which its purpose names more briefly (a subagent's task is long).
      const title = index === 0 ? (lane.purpose ?? text) : text;
      return title.length === 0 ? [] : [{ id: item.id, title: clip(title), created: item.created }];
    });
  };
  const titleOf = (lane: Reducer.Lane) => clip(lane.purpose ?? tasksOf(lane)[0]?.title ?? lane.kind);

  const commits: Commit[] = [];
  const push = (commit: Commit) => {
    commits.push(commit);
    return commit.id;
  };

  // Finished work on the trunk: top-level lanes only; a subagent counts with the thread that delegated it.
  // A subagent whose delegating thread already finished runs on its own, off the trunk.
  const nested = (lane: Reducer.Lane) => {
    const parent = delegator.get(lane.id);
    const parentLane = parent === undefined ? undefined : lanes.get(parent);
    return parentLane !== undefined && (isOpen(parentLane) || !isOpen(lane));
  };
  const finished = view.lanes.filter((lane) => !isOpen(lane) && !nested(lane));
  const running = view.lanes.filter((lane) => isOpen(lane) && !nested(lane));
  const queued = unclaimed(
    view.items.filter((item) => item.status === 'queued' && item.thread === undefined),
    running.filter((lane) => lane.kind === 'light' && tasksOf(lane).length === 0),
  );
  const shown = finished.slice(Math.max(0, finished.length - history));
  const earlier = finished.length - shown.length;

  let trunk = push({
    id: 'overview',
    branch: TRUNK,
    icon: 'ph--path--regular',
    message: summary({
      finished: finished.length,
      earlier,
      running: running.filter(isRunning).length,
      forks: running.length - running.filter(isRunning).length,
      queued: queued.length,
    }),
  });
  for (const lane of shown) {
    trunk = push(finishedCommit(lane, titleOf(lane), TRUNK, trunk));
  }

  /** An open lane as a branch off `from`: its tasks, the prompts queued in it, then the subagents it delegated. */
  const branch = (lane: Reducer.Lane, from: string, seen: Set<Trajectory.ThreadId>) => {
    seen.add(lane.id);
    const name = lane.id;
    const owner = lane.owner.name !== undefined && lane.kind !== 'fresh' ? `${lane.owner.name} · ` : '';
    const tasks = tasksOf(lane);
    const pending = view.items.filter((item) => item.thread === lane.id && item.status === 'queued');
    // A subagent waiting for a slot has only its queued brief, which its purpose already names.
    const notStarted = tasks.length === 0 && pending.length > 0;
    const steps: Task[] = tasks.length > 0 ? tasks : [{ id: lane.id, title: titleOf(lane), created: lane.created }];
    let head = from;
    steps.forEach((task, index) => {
      const current = index === steps.length - 1;
      const status = current ? statusOf(lane, notStarted, lanes, titleOf) : undefined;
      head = push({
        id: `${lane.id}:${task.id}`,
        branch: name,
        parents: [head],
        timestamp: new Date(task.created),
        icon: status?.icon ?? 'ph--check--regular',
        message: `${index === 0 ? owner : ''}${task.title}${status?.note ?? ''}`,
        ...(status?.shimmer ? { tags: [SHIMMER] } : {}),
      });
    });
    for (const item of notStarted ? [] : pending) {
      head = push(queuedCommit(item, name, head));
    }
    for (const child of children.get(lane.id) ?? []) {
      if (seen.has(child.id)) {
        continue;
      }
      if (isOpen(child)) {
        branch(child, head, seen);
      } else {
        head = push(finishedCommit(child, titleOf(child), name, head));
      }
    }
  };

  const seen = new Set<Trajectory.ThreadId>();
  for (const lane of running) {
    branch(lane, trunk, seen);
  }

  let next = trunk;
  for (const item of queued) {
    next = push(queuedCommit(item, QUEUE, next));
  }

  return commits;
};

const isRunning = (lane: Reducer.Lane) => lane.status === 'running' || lane.status === 'waiting';

/**
 * The lane that delegated each subagent: the one whose `thread_delegate` result names the subagent's thread, since a
 * subagent's thread opens on main and records no parent.
 */
const delegators = (view: Reducer.ThreadView, lanes: ReadonlyMap<Trajectory.ThreadId, Reducer.Lane>) => {
  const subagents = view.lanes.filter((lane) => lane.kind === 'fresh');
  const result = new Map<Trajectory.ThreadId, Trajectory.ThreadId>();
  for (const item of view.items) {
    if (item.lane === undefined || !lanes.has(item.lane)) {
      continue;
    }
    for (const block of item.blocks) {
      if (block._tag !== 'toolResult' || block.name !== THREAD_DELEGATE || typeof block.result !== 'string') {
        continue;
      }
      const output = block.result;
      const subagent = subagents.find((lane) => lane.id !== item.lane && output.includes(lane.id));
      if (subagent !== undefined && !result.has(subagent.id)) {
        result.set(subagent.id, item.lane);
      }
    }
  }
  return result;
};

/**
 * The queued prompts no light thread has opened for yet. The runtime opens a prompt's light thread before the thread's
 * turn consumes the prompt, so for a moment the prompt is both queued and a thread; the thread view links the two only
 * by the thread's purpose, which the runtime makes from the prompt's text. Each such thread claims the oldest prompt
 * its purpose names.
 */
const unclaimed = (queued: readonly Reducer.ThreadItem[], opened: readonly Reducer.Lane[]): Reducer.ThreadItem[] => {
  const rest = [...queued];
  for (const lane of opened) {
    const index = rest.findIndex((item) => names(lane.purpose, textOf(item.blocks)));
    if (index !== -1) {
      rest.splice(index, 1);
    }
  }
  return rest;
};

/** Whether a purpose is the text, or the text cut short with an ellipsis. */
const names = (purpose: string | undefined, text: string): boolean =>
  purpose !== undefined &&
  text.length > 0 &&
  (purpose === text || (purpose.endsWith('…') && text.startsWith(purpose.slice(0, -1))));

const queuedCommit = (item: Reducer.ThreadItem, branch: string, parent: string): Commit => ({
  id: `queued:${item.id}`,
  branch,
  parents: [parent],
  timestamp: new Date(item.created),
  icon: 'ph--clock--regular',
  message: clip(textOf(item.blocks)),
  tags: [SHIMMER],
});

const finishedCommit = (lane: Reducer.Lane, title: string, branch: string, parent: string): Commit => ({
  id: `${lane.id}:done`,
  branch,
  parents: [parent],
  timestamp: new Date(lane.created),
  ...(lane.status === 'failed'
    ? { icon: 'ph--x-circle--regular', level: LogLevel.ERROR }
    : { icon: 'ph--check-circle--regular', level: LogLevel.INFO }),
  message: lane.kind === 'fresh' ? `subagent: ${title}` : lane.kind === 'fork' ? `fork: ${title}` : title,
});

type Status = { readonly icon: string; readonly note: string; readonly shimmer: boolean };

const statusOf = (
  lane: Reducer.Lane,
  notStarted: boolean,
  lanes: ReadonlyMap<Trajectory.ThreadId, Reducer.Lane>,
  titleOf: (lane: Reducer.Lane) => string,
): Status => {
  if (notStarted) {
    return { icon: 'ph--clock--regular', note: ' · queued', shimmer: true };
  }
  if (!isRunning(lane)) {
    return { icon: 'ph--git-fork--regular', note: ' · open fork', shimmer: false };
  }
  if (lane.status === 'waiting') {
    const on = lane.waitingOn === undefined ? undefined : lanes.get(lane.waitingOn);
    return {
      icon: 'ph--hourglass--regular',
      note: on === undefined ? ' · waiting' : ` · waiting for ${titleOf(on)}`,
      shimmer: false,
    };
  }
  return {
    icon: lane.kind === 'fresh' ? 'ph--robot--regular' : 'ph--spinner-gap--regular',
    note: '',
    shimmer: true,
  };
};

type Counts = {
  readonly finished: number;
  readonly earlier: number;
  readonly running: number;
  readonly forks: number;
  readonly queued: number;
};

const summary = ({ finished, earlier, running, forks, queued }: Counts): string =>
  [
    `${finished} done${earlier > 0 ? ` (${earlier} earlier not shown)` : ''}`,
    `${running} running`,
    ...(forks > 0 ? [`${forks} open ${forks === 1 ? 'fork' : 'forks'}`] : []),
    ...(queued > 0 ? [`${queued} queued`] : []),
  ].join(' · ');

/** What a person (or the delegating agent) asked for; a status line the runtime adds is not part of it. */
const textOf = (blocks: Reducer.ThreadItem['blocks']): string =>
  blocks
    .flatMap((block) => (block._tag === 'text' && block.disposition !== 'synthetic' ? [block.text] : []))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const LENGTH = 56;

const clip = (text: string) => (text.length > LENGTH ? `${text.slice(0, LENGTH - 1)}…` : text);
