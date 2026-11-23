//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Actor, Task } from '@dxos/types';

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

const UNSTARTED: ReadonlySet<Task.Status | undefined> = new Set([undefined, 'todo', 'backlog']);

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
  const tree = yield* Task.collectTree(task);
  for (const member of tree) {
    if (member.id === task.id || member.assignee?.role === 'assistant') {
      continue;
    }
    const handedBack =
      delegate === null && previousDelegate !== undefined && Task.sameActor(member.delegate, previousDelegate);
    const answering = delegate && !member.assignee ? (Task.owner(Task.getParentTask(member)) ?? owner) : undefined;
    Task.update(member, {
      ...(delegate ? { delegate: { ...delegate } } : handedBack ? { delegate: null } : {}),
      ...(answering ? { assignee: { ...answering } } : {}),
      ...(started && UNSTARTED.has(member.status) ? { status: 'started' as const } : {}),
    });
  }
});
