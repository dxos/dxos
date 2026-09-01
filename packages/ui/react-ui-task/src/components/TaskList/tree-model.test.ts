//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import { TASK_TREE_ROOT_ID, buildTaskForest, createTaskTreeModel } from './tree-model';

describe('buildTaskForest', () => {
  test('builds the tree the walk describes, not the array order', ({ expect }) => {
    const { tasks } = fixture();
    const root = buildTaskForest(tasks);
    expect(root.id).toEqual(TASK_TREE_ROOT_ID);
    expect(titles(root)).toEqual(['a', 'b']);
    expect(titles(root.children[0])).toEqual(['a1', 'a2']);
    expect(titles(root.children[0].children[0])).toEqual(['a1x']);
  });

  test('a dangling parentTask reads as a root', ({ expect }) => {
    const orphan = Task.make({ title: 'orphan', status: 'todo', parentTask: Ref.make(Task.make({ title: 'gone' })) });
    expect(titles(buildTaskForest([orphan]))).toEqual(['orphan']);
  });

  test('a parentTask cycle terminates rather than hanging', ({ expect }) => {
    const one = Task.make({ title: 'one', status: 'todo' });
    const two = Task.make({ title: 'two', status: 'todo', parentTask: Ref.make(one) });
    // A malformed set: each is the other's parent, so neither is a root — matching `walkTaskTree`,
    // which renders nothing rather than looping.
    Obj.update(one, (one) => {
      one.parentTask = Ref.make(two);
    });
    expect(count(buildTaskForest([one, two]))).toEqual(0);
  });
});

describe('createTaskTreeModel', () => {
  test('topology comes from parentTask, sibling order from the array', ({ expect }) => {
    const registry = Registry.make();
    const { a, a1, tasks } = fixture();
    const model = createTaskTreeModel(tasks);

    expect(registry.get(model.childIds())).toEqual([a.id, tasks[2].id]);
    expect(registry.get(model.childIds(a.id))).toEqual([a1.id, tasks[3].id]);
    expect(registry.get(model.childIds(a1.id))).toEqual([tasks[4].id]);
  });

  test('props carry the task title, and branches declare their children', ({ expect }) => {
    const registry = Registry.make();
    const { a, a1, tasks } = fixture();
    const model = createTaskTreeModel(tasks);

    const branch = registry.get(model.itemProps([TASK_TREE_ROOT_ID, a.id]));
    expect(branch.label).toEqual('a');
    expect(branch.parentOf).toEqual([a1.id, tasks[3].id]);

    const leaf = registry.get(model.itemProps([TASK_TREE_ROOT_ID, tasks[2].id]));
    expect(leaf.label).toEqual('b');
    expect(leaf.parentOf).toBeUndefined();
  });

  test('open by default; collapsed ids seed closed', ({ expect }) => {
    const registry = Registry.make();
    const { a, a1, tasks } = fixture();
    const model = createTaskTreeModel(tasks, { collapsed: new Set([a1.id]) });

    expect(registry.get(model.itemOpen([TASK_TREE_ROOT_ID, a.id]))).toEqual(true);
    expect(registry.get(model.itemOpen([TASK_TREE_ROOT_ID, a.id, a1.id]))).toEqual(false);
  });

  test('a task appears at exactly one path, so id-keyed collapse is unambiguous', ({ expect }) => {
    const { a1, tasks } = fixture();
    const paths: string[][] = [];
    const walk = (node: { id: string; children: any[] }, path: string[]): void => {
      const next = [...path, node.id];
      if (node.id === a1.id) {
        paths.push(next);
      }
      node.children.forEach((child) => walk(child, next));
    };
    walk(buildTaskForest(tasks), []);
    expect(paths).toHaveLength(1);
  });
});

const fixture = () => {
  const a = Task.make({ title: 'a', status: 'todo' });
  const a1 = Task.make({ title: 'a1', status: 'todo', parentTask: Ref.make(a) });
  const b = Task.make({ title: 'b', status: 'todo' });
  const a2 = Task.make({ title: 'a2', status: 'todo', parentTask: Ref.make(a) });
  const a1x = Task.make({ title: 'a1x', status: 'todo', parentTask: Ref.make(a1) });
  return { a, a1, a1x, a2, b, tasks: [a, a1, b, a2, a1x] };
};

const titles = (node: { children: { task?: { title?: string } }[] }): (string | undefined)[] =>
  node.children.map((child) => child.task?.title);

const count = (node: { children: any[] }): number =>
  node.children.reduce((total, child) => total + count(child), node.children.length);
