//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import {
  type TaskPlacement,
  resolveIndent,
  resolveNudge,
  resolveOutdent,
  resolveTaskPlacement,
  walkTaskTree,
} from './hierarchy.ts';

describe('walkTaskTree', () => {
  test('walks the tree, not the array', ({ expect }) => {
    const { tasks } = fixture();
    expect(walkTaskTree(tasks).map(({ task }) => task.title)).toEqual(['a', 'a1', 'a1x', 'a2', 'b']);
  });

  test('depth, branch and sibling position come out of the walk', ({ expect }) => {
    const { tasks } = fixture();
    const rows = walkTaskTree(tasks);
    expect(rows.map(({ level }) => level)).toEqual([1, 2, 3, 2, 1]);
    expect(rows.map(({ branch }) => branch)).toEqual([true, true, false, false, false]);
    // `a1` is 1 of 2 among `a`'s children; `b` is 2 of 2 among the roots.
    expect(rows.map(({ position, setSize }) => `${position}/${setSize}`)).toEqual(['1/2', '1/2', '1/1', '2/2', '2/2']);
    expect(rows.map(({ ancestors }) => ancestors.length)).toEqual([0, 1, 2, 1, 0]);
  });

  test('a collapsed task hides its descendants but keeps its own row', ({ expect }) => {
    const { a1, tasks } = fixture();
    expect(walkTaskTree(tasks, new Set([a1.id])).map(({ task }) => task.title)).toEqual(['a', 'a1', 'a2', 'b']);
  });

  test('a parentTask cycle renders short rather than hanging', ({ expect }) => {
    const one = Task.make({ title: 'one', status: 'todo' });
    const two = Task.make({ title: 'two', status: 'todo', parentTask: Ref.make(one) });
    // A malformed set: each is the other's parent, so neither is a root.
    Obj.update(one, (one) => {
      one.parentTask = Ref.make(two);
    });
    expect(walkTaskTree([one, two])).toEqual([]);
  });
});

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

  test('onto a task makes it the last child', ({ expect }) => {
    const { tasks, b, a1 } = fixture();
    expect(format(resolveTaskPlacement({ tasks, source: b, target: a1, intent: 'make-child' }))).to.eq('a1/end');
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

/**
 * `a` and `b` are roots; `a1`/`a2` are children of `a`, `a1x` a child of `a1`. Array order is
 * sibling order only, so the fixture deliberately does NOT store a pre-order traversal — `b` sits
 * between `a`'s children, which is exactly the divergence the walk has to absorb.
 */
const fixture = () => {
  const a = Task.make({ title: 'a', status: 'todo' });
  const a1 = Task.make({ title: 'a1', status: 'todo', parentTask: Ref.make(a) });
  const b = Task.make({ title: 'b', status: 'todo' });
  const a2 = Task.make({ title: 'a2', status: 'todo', parentTask: Ref.make(a) });
  const a1x = Task.make({ title: 'a1x', status: 'todo', parentTask: Ref.make(a1) });
  return { a, a1, a1x, a2, b, tasks: [a, a1, b, a2, a1x] };
};

/** A placement reads as `<parent title or root>/<before title or end>`. */
const format = (placement: TaskPlacement | undefined): string =>
  placement === undefined ? 'rejected' : `${placement.parentTask?.title ?? 'root'}/${placement.before?.title ?? 'end'}`;
