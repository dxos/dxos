//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { type TaskPlacement, resolveIndent, resolveNudge, resolveOutdent, resolveTaskPlacement } from './hierarchy.ts';
import { buildTaskForest, flattenVisibleTasks } from './tree-model.ts';

describe('resolveTaskPlacement', () => {
  test('above a task takes its parent and anchors on it', ({ expect }) => {
    const { tasks, b, a2 } = fixture();
    expect(format(resolveTaskPlacement({ tasks, source: b, target: a2, intent: 'reorder-above' }))).to.eq('a/a2');
  });

  test('below a task anchors on the sibling that follows it', ({ expect }) => {
    const { tasks, b, a1 } = fixture();
    expect(format(resolveTaskPlacement({ tasks, source: b, target: a1, intent: 'reorder-below' }))).to.eq('a/a2');
  });

  test('below the last sibling is unanchored, which lands it last', ({ expect }) => {
    const { tasks, b, a2 } = fixture();
    expect(format(resolveTaskPlacement({ tasks, source: b, target: a2, intent: 'reorder-below' }))).to.eq('a/end');
  });

  test('below a root task keeps the task at the root', ({ expect }) => {
    const { tasks, a1, b } = fixture();
    expect(format(resolveTaskPlacement({ tasks, source: a1, target: b, intent: 'reorder-below' }))).to.eq('root/end');
  });

  test('onto a task makes it the first child', ({ expect }) => {
    const { tasks, b, a1 } = fixture();
    // Anchored on `a1`'s existing first child: the pointer is on the parent's row, and the place
    // directly under that row is where the reader expects the task to appear.
    expect(format(resolveTaskPlacement({ tasks, source: b, target: a1, intent: 'make-child' }))).to.eq('a1/a1x');
  });

  test('onto a childless task there is nothing to anchor on', ({ expect }) => {
    const { tasks, b, a2 } = fixture();
    expect(format(resolveTaskPlacement({ tasks, source: b, target: a2, intent: 'make-child' }))).to.eq('a2/end');
  });

  test('the source is skipped when anchoring, so a nudge down actually moves', ({ expect }) => {
    const { tasks, a1, a2 } = fixture();
    // `a1` dropped below itself's own successor must not anchor on `a1`.
    expect(format(resolveTaskPlacement({ tasks, source: a1, target: a2, intent: 'reorder-below' }))).to.eq('a/end');
  });

  test('a task cannot be dropped onto itself or into its own subtree', ({ expect }) => {
    const { tasks, a, a1, a1x } = fixture();
    expect(resolveTaskPlacement({ tasks, source: a, target: a, intent: 'make-child' })).to.be.undefined;
    expect(resolveTaskPlacement({ tasks, source: a, target: a1x, intent: 'make-child' })).to.be.undefined;
    expect(resolveTaskPlacement({ tasks, source: a1, target: a1x, intent: 'reorder-above' })).to.be.undefined;
  });

  test('a task from another set is rejected rather than absorbed', ({ expect }) => {
    const { tasks, a } = fixture();
    const foreign = Task.make({ title: 'foreign', status: 'todo' });
    expect(resolveTaskPlacement({ tasks, source: foreign, target: a, intent: 'make-child' })).to.be.undefined;
    expect(resolveTaskPlacement({ tasks, source: a, target: foreign, intent: 'make-child' })).to.be.undefined;
  });
});

describe('keyboard placements', () => {
  test('indent makes the task the last child of its previous sibling', ({ expect }) => {
    const { tasks, a2, b } = fixture();
    expect(format(resolveIndent(tasks, a2))).to.eq('a1/end');
    expect(format(resolveIndent(tasks, b))).to.eq('a/end');
  });

  test('the first task among its siblings cannot indent', ({ expect }) => {
    const { tasks, a, a1 } = fixture();
    expect(resolveIndent(tasks, a)).to.be.undefined;
    expect(resolveIndent(tasks, a1)).to.be.undefined;
  });

  test('outdent makes the task the next sibling of its parent', ({ expect }) => {
    const { tasks, a1, a1x } = fixture();
    expect(format(resolveOutdent(tasks, a1))).to.eq('root/b');
    expect(format(resolveOutdent(tasks, a1x))).to.eq('a/a2');
  });

  test('a root task cannot outdent', ({ expect }) => {
    const { tasks, a, b } = fixture();
    expect(resolveOutdent(tasks, a)).to.be.undefined;
    expect(resolveOutdent(tasks, b)).to.be.undefined;
  });

  test('a nudge moves within the current parent only', ({ expect }) => {
    const { tasks, a1, a2, b } = fixture();
    expect(format(resolveNudge(tasks, a2, 'up'))).to.eq('a/a1');
    expect(format(resolveNudge(tasks, a1, 'down'))).to.eq('a/end');
    expect(format(resolveNudge(tasks, b, 'up'))).to.eq('root/a');
  });

  test('a nudge at either end is a no-op', ({ expect }) => {
    const { tasks, a, a1, a2, b } = fixture();
    expect(resolveNudge(tasks, a1, 'up')).to.be.undefined;
    expect(resolveNudge(tasks, a2, 'down')).to.be.undefined;
    expect(resolveNudge(tasks, a, 'up')).to.be.undefined;
    expect(resolveNudge(tasks, b, 'down')).to.be.undefined;
  });
});

describe('keyboard moves applied', () => {
  test('Tab indents under the previous sibling, and Shift+Tab makes it the following peer of its parent', ({
    expect,
  }) => {
    const { tasks, a2 } = fixture();
    const indented = move(tasks, a2, resolveIndent(tasks, a2));
    expect(outline(indented)).to.eq('a .a1 ..a1x ..a2 b');

    const outdented = move(indented, a2, resolveOutdent(indented, a2));
    expect(outline(outdented)).to.eq('a .a1 ..a1x .a2 b');
  });

  test("Shift+Tab on a middle child lands it directly after its parent, ahead of the parent's next peer", ({
    expect,
  }) => {
    const { tasks, a1 } = fixture();
    const outdented = move(tasks, a1, resolveOutdent(tasks, a1));
    // `a1` keeps its own child, and lands between `a` and `b`.
    expect(outline(outdented)).to.eq('a .a2 a1 .a1x b');
  });

  test('a subtree moves with its root', ({ expect }) => {
    const { tasks, a1, b } = fixture();
    const nudged = move(tasks, a1, resolveNudge(tasks, a1, 'down'));
    expect(outline(nudged)).to.eq('a .a2 .a1 ..a1x b');
    const indented = move(tasks, b, resolveIndent(tasks, b));
    expect(outline(indented)).to.eq('a .a1 ..a1x .a2 .b');
  });
});

/**
 * Applies a placement the way `MoveTask` does — out of the old parent's `subtasks`, into the new
 * one's before the anchor, re-parented, and repositioned in the root order — so a test reads the tree
 * the move produces rather than its two terms.
 */
const move = (tasks: readonly Task.Task[], task: Task.Task, placement: TaskPlacement | undefined): Task.Task[] => {
  if (!placement) {
    throw new Error(`No placement for ${task.title}.`);
  }
  const { parentTask, before } = placement;
  const previous = Task.getParentTask(task);
  if (previous) {
    Obj.update(previous, (previous) => {
      TaskSet.removeRefsInPlace(previous.subtasks ?? [], new Set([task.id]));
    });
  }
  if (parentTask) {
    Obj.update(parentTask, (parentTask) => {
      parentTask.subtasks ??= [];
      TaskSet.insertInPlace(parentTask.subtasks, Ref.make(task), before?.id);
    });
  }
  Obj.setParent(task, parentTask ?? undefined);
  const rest = tasks.filter((candidate) => candidate.id !== task.id);
  const anchor = before ? rest.findIndex((candidate) => candidate.id === before.id) : -1;
  return anchor === -1 ? [...rest, task] : [...rest.slice(0, anchor), task, ...rest.slice(anchor)];
};

/** The rendered walk, one title per row with a dot per level of depth. */
const outline = (tasks: readonly Task.Task[]): string => {
  const depth = (task: Task.Task): number => {
    const parentId = Task.parentTaskId(task);
    const parent = parentId === undefined ? undefined : tasks.find((candidate) => candidate.id === parentId);
    return parent ? depth(parent) + 1 : 0;
  };
  return flattenVisibleTasks(buildTaskForest(tasks))
    .map((task) => `${'.'.repeat(depth(task))}${task.title}`)
    .join(' ');
};

/**
 * `a` and `b` are roots; `a1`/`a2` are children of `a`, `a1x` a child of `a1`. The flat list is
 * deliberately NOT a pre-order traversal — `b` sits between `a`'s children — so the walk has to
 * take placement from the parent edges and sibling order from `subtasks`.
 */
const fixture = () => {
  const a1x = Task.make({ title: 'a1x', status: 'todo' });
  const a1 = Task.make({ title: 'a1', status: 'todo', subtasks: [Ref.make(a1x)] });
  const a2 = Task.make({ title: 'a2', status: 'todo' });
  const a = Task.make({ title: 'a', status: 'todo', subtasks: [Ref.make(a1), Ref.make(a2)] });
  const b = Task.make({ title: 'b', status: 'todo' });
  return { a, a1, a1x, a2, b, tasks: [a, a1, b, a2, a1x] };
};

/** A placement reads as `<parent title or root>/<before title or end>`. */
const format = (placement: TaskPlacement | undefined): string =>
  placement === undefined ? 'rejected' : `${placement.parentTask?.title ?? 'root'}/${placement.before?.title ?? 'end'}`;
