//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Actor, Task } from '@dxos/types';

/**
 * The assignee an agent's claim writes: the parent's person (`answering`) wins over a person the claim names, which is
 * used only where nobody answers yet; a step with its own person (`owned`) is left unwritten.
 * Clearing the assignee or naming an agent passes through, for the owner check to refuse.
 */
export const claimedAssignee = <A extends Actor.Actor | null | undefined>(
  answering: Actor.Actor | undefined,
  assignee: A,
  { owned = false }: { owned?: boolean } = {},
): Actor.Actor | A | undefined => {
  if (assignee !== undefined && (assignee === null || Task.owner({ assignee }) === undefined)) {
    return assignee;
  }
  return owned ? undefined : answering ? { ...answering } : assignee;
};

/** Statuses a claim moves to `started`; anything further along keeps its own state. */
const UNSTARTED: ReadonlySet<Task.Status | undefined> = new Set([undefined, 'todo', 'backlog']);

/**
 * A task with sub-tasks is one unit of work, so claiming any task in the tree — delegating it, or
 * starting it — claims the root and every descendant with it; otherwise a sub-task can be picked up
 * by a second session working against the first. Handing it back hands back the members the same
 * delegate held. A member with no person takes its parent's, else the claim's owner, so its finish waits on them
 * too; a member an agent holds as its own task is left to it.
 */
export const cascadeClaim = Effect.fnUntraced(function* (
  task: Task.Task,
  {
    delegate,
    previousDelegate,
    owner,
    started,
  }: {
    delegate: Actor.Actor | null | undefined;
    previousDelegate: Actor.Actor | undefined;
    owner: Actor.Actor | undefined;
    started: boolean;
  },
) {
  if (delegate === undefined && !started) {
    return;
  }
  // Root first, so a member reads the person its parent was just given.
  const tree = yield* Task.collectTree(task);
  for (const member of tree) {
    if (member.id === task.id || member.assignee?.role === 'assistant') {
      continue;
    }
    const handedBack =
      delegate === null && previousDelegate !== undefined && Task.sameActor(member.delegate, previousDelegate);
    const answering = delegate && !member.assignee ? (Task.owner(Task.getParentTask(member)) ?? owner) : undefined;
    Task.update(member, {
      // A copy per task: ECHO refuses to store a record another object already owns.
      ...(delegate ? { delegate: { ...delegate } } : handedBack ? { delegate: null } : {}),
      ...(answering ? { assignee: { ...answering } } : {}),
      ...(started && UNSTARTED.has(member.status) ? { status: 'started' as const } : {}),
    });
  }
});
